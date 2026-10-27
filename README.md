# mydigitalid-sso

TypeScript client for [MyDigital ID](https://developer.digital-id.my/) SSO (OIDC) in the browser. It is a thin, typed wrapper over [`keycloak-js`](https://www.npmjs.com/package/keycloak-js).

## Why am I doing this?

Because not everyone uses PHP and Next. Feel free to fork and submit PR if you want to make any changes.

## What it does

- Connects to MyDigital ID SSO (default `https://sso.digital-id.my`) with the standard flow and PKCE.
- Restores an existing SSO session on page load (silent check-sso).
- Logs in, logs out, and refreshes tokens.
- Maps MyDigital ID token claims to a typed profile: `nric`, `fullName` (`nama`), `givenName`, `familyName`, `expiresAt`.
- Optionally keeps the session in `sessionStorage` across reloads (off by default).
- Ships ESM, CJS and type declarations.

It is a **public-client, browser-only** library. Do not put a client secret in front-end code.

## Install

```sh
npm install mydigitalid-sso
```

## Setup

1. Ask MyDigital ID for a **realm** and a **public client ID**, and register your app's origin (for example `https://app.example.com`) as a valid redirect URI.
2. Serve the silent check-sso page from your web root at `/checksso.html`. Copy it from the package:

   ```sh
   cp node_modules/mydigitalid-sso/public/checksso.html ./public/checksso.html
   ```

   Or host it elsewhere and pass `silentCheckSsoRedirectUri`.

## Usage

```ts
import { createMyDigitalIdClient } from "mydigitalid-sso";

const id = await createMyDigitalIdClient({
  realm: "your-realm",
  clientId: "your-public-client",
  persistSession: true, // optional
});

if (id.authenticated) {
  const profile = id.getProfile()!;
  console.log(profile.nric, profile.fullName, profile.expiresAt);
} else {
  await id.login(); // redirects to MyDigital ID
}

await id.refreshToken(); // refresh if expiring within 30s
await id.refreshToken(-1); // force refresh
await id.logout();
```

Or create the client and init it yourself:

```ts
import { MyDigitalIdClient } from "mydigitalid-sso";

const id = new MyDigitalIdClient({ realm: "...", clientId: "..." });
const authenticated = await id.init(); // idempotent
```

Sending the token to your backend:

```ts
await fetch("/api/me", {
  headers: { Authorization: `Bearer ${id.tokens.token}` },
});
```

Always verify tokens on the server. `decodeJwt` does not check signatures.

## API

### `MyDigitalIdConfig`

| Option                      | Default                     | Notes                           |
| --------------------------- | --------------------------- | ------------------------------- |
| `realm`                     | required                    | Realm issued to your app        |
| `clientId`                  | required                    | Public client ID                |
| `url`                       | `https://sso.digital-id.my` | SSO base URL                    |
| `silentCheckSsoRedirectUri` | `<origin>/checksso.html`    | Silent check-sso page           |
| `checkLoginIframe`          | `true`                      | Session-status iframe           |
| `persistSession`            | `false`                     | Keep tokens in `sessionStorage` |
| `storageKey`                | `mydigitalid.session`       | Key used when persisting        |

### `MyDigitalIdClient`

| Member                           | Description                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `init()`                         | Run check-sso and restore any persisted session. Resolves to `authenticated`. Safe to call repeatedly. |
| `authenticated`                  | `true` when signed in                                                                                  |
| `tokens`                         | `{ token, refreshToken, idToken }`                                                                     |
| `getProfile()`                   | `MyDigitalIdProfile`, or `null` when signed out                                                        |
| `login({ redirectUri? })`        | Redirect to MyDigital ID. Returns to the current page by default.                                      |
| `logout({ redirectUri? })`       | Clear the stored session and sign out                                                                  |
| `refreshToken(minValidity = 30)` | Resolves to `true` if refreshed. `-1` forces it.                                                       |
| `keycloak`                       | The underlying `keycloak-js` instance                                                                  |

Also exported: `createMyDigitalIdClient`, `decodeJwt`, `profileFromClaims`, `DEFAULT_SSO_URL`, and the types `MyDigitalIdConfig`, `MyDigitalIdProfile`, `MyDigitalIdTokens`, `LoginOptions`, `LogoutOptions`.

## Security notes

- Tokens in `sessionStorage` can be read by any script on your page, which is why `persistSession` is off by default.
- The legacy `htmloidc` test page stored a client secret in a cookie. The Keycloak JS adapter never used it, and this package has no secret option.

## Testing

```sh
npm install
npm run typecheck   # tsc --noEmit
npm test            # unit tests (vitest + jsdom, keycloak-js mocked)
npm run build       # tsup -> dist/ (ESM, CJS, .d.ts)
```

The unit tests cover claim mapping, JWT decoding, config validation, the default URL and init options, idempotent `init`, session persist, restore and expiry, logout cleanup and refresh. They do not talk to the real SSO.

### Try it against the real SSO (playground)

```sh
npm run playground   # http://localhost:8080
```

1. Register `http://localhost:8080` as a redirect URI for your client with MyDigital ID. The port is fixed (`strictPort`) for that reason.
2. Open the page, enter realm and client ID (and optionally an SSO URL), tick `persistSession` if wanted, then click **Save & init**. Settings are kept in `localStorage`. There is no secret field.
3. Click **Log in**. After returning, the table shows NRIC, names and expiry.
4. Try **Force refresh token**, **Show claims** and **Log out**, and reload the page to check session restore.

The playground lives in `test/playground/` and runs against `src/` through a Vite alias, so changes show up immediately.

## Publish

```sh
npm pack --dry-run   # inspect the tarball
npm publish          # prepublishOnly runs typecheck, tests and build
```
