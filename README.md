# Quality Care Portal

A simpler front end for Quality Care's daily work, built with Next.js, Tailwind, shadcn and Recharts. All data lives in ERPNext. This app has no database of its own, and Desk stays available from "Open Full System".

## Run it

```bash
cp .env.example .env.local   # fill in the values, and set SESSION_SECRET with: openssl rand -base64 36
npm install
npm run dev                  # http://localhost:3000, or add --port 3100 for another port
```

For production use `npm run build` and `npm start`, behind HTTPS. `SESSION_COOKIE_SECURE=false` is only for testing the production build over plain http.

## How it connects

- Server code calls the versioned API at `/api/method/quality_care.api.v1.<endpoint>` (`src/lib/frappe/client.ts`). The browser never talks to Frappe directly.
- Sign-in exchanges the password for OAuth Bearer tokens. They sit in an encrypted, httpOnly cookie, and `src/proxy.ts` refreshes them before they expire.
- Every call runs as the signed-in person, so Frappe's roles decide what they can see and do. The menu only hides what the role can't reach, and the API is what enforces it.
- Signing in also opens Desk: the browser passes through Frappe once for its cookie and comes straight back. This needs `portal_url` in the Frappe site config to match this app's address. "Open Full System" and "Open in Desk" use the same one-time key, and signing out closes Desk too.

## Password reset

Reset emails need an outgoing Email Account on the Frappe site. To send people to this portal instead of Frappe's own reset page, run `bench --site <site> set-config portal_url https://your-portal-address`.

## Website images

`public/site-images/` holds the 15 images from quality-care.co.ke. The sign-in background comes from `1-scaled.jpg`.

## Checks

`tests/check_portal.cjs` drives Chrome through each role's work, including sign-in, password reset, search and the dashboard. It posts real documents, so run it only against the throwaway `qctest.localhost` site described in the quality_care app's README.
