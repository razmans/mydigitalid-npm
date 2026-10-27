import type { KeycloakTokenParsed } from "keycloak-js";
import type { MyDigitalIdProfile } from "./types";

const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

/** Map ID token claims to a {@link MyDigitalIdProfile}. */
export function profileFromClaims(claims: KeycloakTokenParsed): MyDigitalIdProfile {
  const c = claims as KeycloakTokenParsed & Record<string, unknown>;
  return {
    nric: str(c.nric),
    fullName: str(c.nama),
    givenName: str(c.given_name),
    familyName: str(c.family_name),
    expiresAt: typeof c.exp === "number" ? new Date(c.exp * 1000) : undefined,
    claims: c,
  };
}

/** Decode a JWT payload without verifying it. Returns `null` if malformed. */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}
