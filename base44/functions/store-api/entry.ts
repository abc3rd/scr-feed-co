import { createClientFromRequest } from "npm:@base44/sdk@0.8.53";
import postgres from "npm:postgres@3.4.8";
import { secrets } from "base44:runtime";
import { dispatch } from "./service.js";
import { StoreError } from "./domain.js";

let database: ReturnType<typeof postgres> | undefined;

export default async function (req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const headers = { "Cache-Control": "no-store", "X-Request-ID": requestId };
  if (req.method !== "POST")
    return Response.json(
      { error: "Use POST." },
      { status: 405, headers: { ...headers, Allow: "POST" } },
    );
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(() => null);
    if (!user)
      return Response.json(
        { error: "Sign in to continue." },
        { status: 401, headers },
      );
    // Bound request size before parsing (Content-Length is not trusted).
    const raw = await req.text();
    if (raw.length > 64000)
      return Response.json(
        { error: "Request is too large." },
        { status: 413, headers },
      );
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new StoreError("Invalid JSON.");
    }
    const url = secrets.get("SCR_DATABASE_URL");
    if (!url)
      return Response.json(
        {
          error:
            "The store database is not connected yet. Please contact the store.",
        },
        { status: 503, headers },
      );
    database ??= postgres(url, {
      max: 2,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: { rejectUnauthorized: true },
    });
    const result = await dispatch(database, user, body);
    if (body.action === "delete-profile") {
      // Profile deletion is idempotent. A failed identity deletion can be retried.
      try {
        await client.asServiceRole.entities.User.delete(user.id);
      } catch {
        return Response.json(
          {
            error:
              "Your store data was removed, but sign-in account deletion is still pending. Retry Delete account to finish.",
          },
          { status: 503, headers },
        );
      }
      // Keep a revocation tombstone so a still-valid token cannot recreate a
      // deleted profile if the identity provider has not invalidated it yet.
      return Response.json({ deleted: true }, { headers });
    }
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof StoreError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    const code = (error as { code?: string })?.code;
    console.error(
      JSON.stringify({
        requestId,
        event: "store_api_failure",
        code: code ?? "unknown",
      }),
    );
    if (code === "42P01")
      return Response.json(
        {
          error: "The store database needs initialization by an administrator.",
        },
        { status: 503, headers },
      );
    if (code === "23505" || code === "40001" || code === "40P01")
      return Response.json(
        {
          error:
            "Another request changed these records. Refresh and try again.",
        },
        { status: 409, headers },
      );
    return Response.json(
      {
        error: "The store is temporarily unavailable. Please try again.",
        requestId,
      },
      { status: 503, headers },
    );
  }
}
