import type { KeycloakTokenParsed } from "keycloak-js";

/** Default MyDigital ID SSO base URL. */
export const DEFAULT_SSO_URL = "https://sso.digital-id.my";

export interface MyDigitalIdConfig {
  /** Realm issued to your application. */
  realm: string;
  /** Public client ID registered with MyDigital ID. */
  clientId: string;
  /** SSO base URL. Defaults to {@link DEFAULT_SSO_URL}. */
  url?: string;
  /**
   * URL of the silent check-sso page (see `public/checksso.html`).
   * Defaults to `<origin>/checksso.html` in browsers.
   */
  silentCheckSsoRedirectUri?: string;
  /** Enable the session-status iframe. Defaults to `true`. */
  checkLoginIframe?: boolean;
  /**
   * Persist tokens in `sessionStorage` so a page reload restores the session
   * without a round trip. Defaults to `false`.
   */
  persistSession?: boolean;
  /** Storage key used when `persistSession` is on. Defaults to `"mydigitalid.session"`. */
  storageKey?: string;
}

export interface LoginOptions {
  /** Where to return after login. Defaults to the current page. */
  redirectUri?: string;
}

export interface LogoutOptions {
  /** Where to return after logout. Defaults to the current page. */
  redirectUri?: string;
}

/** User details read from the MyDigital ID token claims. */
export interface MyDigitalIdProfile {
  /** NRIC number (`nric` claim). */
  nric?: string;
  /** Full name (`nama` claim). */
  fullName?: string;
  givenName?: string;
  familyName?: string;
  /** Token expiry. */
  expiresAt?: Date;
  /** All raw claims. */
  claims: KeycloakTokenParsed & Record<string, unknown>;
}

export interface MyDigitalIdTokens {
  token?: string;
  refreshToken?: string;
  idToken?: string;
}
