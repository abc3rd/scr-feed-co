import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { testDatabase } from "./database.js";
import { dispatch } from "../base44/functions/store-api/service.js";

// Only auth is intercepted. Store requests execute the production service
// against a real PostgreSQL WASM engine, with fixtures confined to this test.
test(
  "mobile ordering, cancellation, staff hand-off, QR privacy, and dark mode",
  { timeout: 120000 },
  async (t) => {
    const admin = {
      id: "mobile-admin",
      email: "staff@example.test",
      role: "admin",
    };
    const buyer = {
      id: "mobile-buyer",
      email: "buyer@example.test",
      role: "user",
    };
    const stranger = {
      id: "mobile-stranger",
      email: "stranger@example.test",
      role: "user",
    };
    const database = await testDatabase();
    let vite, browser;
    t.after(async () => {
      if (browser) await browser.close();
      if (vite) vite.kill("SIGTERM");
      await database.close();
    });

    const call = (user, body) => dispatch(database.sql, user, body);
    await call(admin, { action: "initialize" });
    await call(admin, {
      action: "save-product",
      sku: "TEST-FEED",
      name: "Test feed",
      category: "Feed",
      size: "Test bag",
      priceCents: 2500,
      onHand: 8,
      reorderThreshold: 2,
      active: true,
      location: "LaBelle",
      expectedVersion: null,
    });
    for (const user of [admin, buyer, stranger])
      await call(user, {
        action: "update-me",
        firstName: "Test",
        lastName: "Customer",
        preferredStore: "LaBelle",
      });
    vite = spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        "--host",
        "127.0.0.1",
        "--port",
        "5197",
        "--strictPort",
      ],
      {
        env: {
          ...process.env,
          VITE_BASE44_APP_ID: "000000000000000000000001",
          VITE_BASE44_APP_BASE_URL: "http://127.0.0.1:5197",
        },
        stdio: "pipe",
      },
    );

    let startup = "";
    vite.stdout.on("data", (buffer) => {
      startup += buffer;
    });
    vite.stderr.on("data", (buffer) => {
      startup += buffer;
    });
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 15000;
      const timer = setInterval(() => {
        if (startup.includes("127.0.0.1:5197")) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() > deadline) {
          clearInterval(timer);
          reject(new Error("Vite did not start: " + startup));
        }
      }, 100);
    });
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROMIUM_EXECUTABLE_PATH
        ? {
            executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
            args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
          }
        : {}),
    });
    const errors = [];
    const open = async (user, colorScheme = "light") => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const url = route.request().url();
        if (new URL(url).pathname.startsWith("/api/")) {
          if (url.includes("/public-settings/"))
            return route.fulfill({
              json: { id: "000000000000000000000001", public_settings: {} },
            });
          if (url.endsWith("/entities/User/me"))
            return user
              ? route.fulfill({ json: user })
              : route.fulfill({ status: 401, json: { error: "Sign in" } });
          if (url.includes("/functions/store-api")) {
            try {
              return route.fulfill({
                json: await call(user, route.request().postDataJSON()),
              });
            } catch (error) {
              return route.fulfill({
                status: error.status || 500,
                json: { error: error.message },
              });
            }
          }
          return route.fulfill({ json: {} });
        }
        if (url.startsWith("http://127.0.0.1:5197") || url.startsWith("data:"))
          return route.continue();
        // No production API, QR service, analytics, or cookie-script traffic.
        return route.fulfill({ body: "", status: 200 });
      });
      return { context, page };
    };
    const { page } = await open(buyer);
    await page.goto("http://127.0.0.1:5197/");
    const order = async () => {
      await page.getByRole("button", { name: "Add Test feed to cart" }).click();
      await page.getByRole("button", { name: /View cart/ }).click();
      await page
        .getByRole("button", { name: "Review order", exact: true })
        .click();
      await page.getByRole("checkbox", { name: /I have checked/ }).check();
      await page
        .getByRole("button", { name: "Submit order", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Your order", exact: true })
        .waitFor();
      return page.url().split("/").at(-1);
    };
    const first = await order();
    assert.equal(
      (await call(admin, { action: "inventory", location: "LaBelle" }))
        .products[0].reserved,
      1,
    );
    await page.reload();
    await page
      .getByRole("heading", { name: "Your order", exact: true })
      .waitFor();
    assert.equal((await call(buyer, { action: "orders" })).orders.length, 1);
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Cancel order", exact: true })
      .click();
    await page.getByText("Cancelled", { exact: true }).waitFor();
    assert.equal(
      (await call(admin, { action: "inventory", location: "LaBelle" }))
        .products[0].reserved,
      0,
    );
    await page.goto("http://127.0.0.1:5197/");
    const second = await order();
    assert.notEqual(first, second);
    const { page: staff } = await open(admin, "dark");
    await staff.goto("http://127.0.0.1:5197/yard");
    await staff
      .getByRole("button", { name: "Start picking", exact: true })
      .click();
    await staff.getByText("Picking", { exact: true }).waitFor();
    await staff.getByRole("checkbox").check();
    await staff
      .getByRole("button", { name: "Mark ready", exact: true })
      .click();
    await staff.getByText("Ready", { exact: true }).waitFor();
    await staff.getByRole("checkbox").check();
    await staff
      .getByRole("spinbutton", { name: /Amount collected/ })
      .fill("26.75");
    staff.once("dialog", (dialog) => dialog.accept());
    await staff
      .getByRole("button", { name: "Complete hand-off", exact: true })
      .click();
    await staff
      .getByText("No active orders at LaBelle.", { exact: true })
      .waitFor();
    const inventory = (
      await call(admin, { action: "inventory", location: "LaBelle" })
    ).products[0];
    assert.equal(inventory.onHand, 7);
    assert.equal(inventory.reserved, 0);
    assert.equal(
      (await call(buyer, { action: "order", orderId: second })).order
        .finalAmount,
      26.75,
    );
    const { token } = await call(buyer, { action: "my-qr" });
    await page.goto(`http://127.0.0.1:5197/m/${token}`);
    await page.getByRole("button", { name: "Reorder these items" }).waitFor();
    await page.getByRole("button", { name: "Reorder these items" }).click();
    await page
      .getByRole("button", { name: "Review order", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.goto("http://127.0.0.1:5197/profile");
    await page.getByAltText("Your barn QR code").waitFor();
    assert.match(
      await page.getByAltText("Your barn QR code").getAttribute("src"),
      /^data:image\/png/,
    );
    const { page: outsider } = await open(stranger, "dark");
    await outsider.goto(`http://127.0.0.1:5197/m/${token}`);
    await outsider
      .getByText("Sign in with the account that owns this QR code.", {
        exact: true,
      })
      .waitFor();
    await outsider.goto("http://127.0.0.1:5197/yard");
    await outsider
      .getByText("This area is for SCR store staff.", { exact: true })
      .waitFor();
    for (const scheme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of ["/", "/orders", "/profile", "/review"]) {
        await page.goto("http://127.0.0.1:5197" + path);
        await page.locator("main").waitFor();
        if (
          process.env.SCR_SCREENSHOT_DIR &&
          ["/orders", "/profile"].includes(path)
        ) {
          await page
            .getByRole("heading", {
              name: path === "/orders" ? "Orders" : "Profile",
              exact: true,
            })
            .waitFor();
          await mkdir(process.env.SCR_SCREENSHOT_DIR, { recursive: true });
          await page.screenshot({
            path:
              process.env.SCR_SCREENSHOT_DIR +
              "/" +
              scheme +
              path.replaceAll("/", "-") +
              ".png",
            fullPage: true,
          });
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `${scheme} ${path} overflow`,
        );
      }
    }
    assert.deepEqual(errors, []);
  },
);
