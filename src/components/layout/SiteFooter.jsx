import React from "react";

const LINKS = [
  ["Terms", "/terms.html"],
  ["SMS Terms", "/terms.html#sms"],
  ["Privacy", "https://scr-feed-app.vercel.app/privacy.html"],
  ["Cookies", "https://scr-feed-app.vercel.app/cookies.html"],
  ["Text & email opt-in", "https://scr-feed-app.vercel.app/sms-consent.html"],
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/60">
      <div className="max-w-xl mx-auto px-4 pt-8 pb-28">
        <p className="font-heading text-2xl tracking-wide text-primary">SCR Feed Co.</p>
        <p className="text-sm text-muted-foreground">LaBelle · Fort Myers, Florida</p>
        <nav aria-label="Legal" className="mt-4">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {LINKS.map(([label, href]) => (
              <li key={label}>
                <a href={href} target={href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer" className="inline-block py-2 underline underline-offset-4 decoration-border hover:decoration-primary rounded">
                  {label}
                </a>
              </li>
            ))}
            <li>
              <button type="button" data-open-cookie-prefs className="py-2 underline underline-offset-4 decoration-border hover:decoration-primary rounded">
                Cookie preferences
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
