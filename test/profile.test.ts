import { describe, expect, it } from "vitest";
import { decodeJwt, profileFromClaims } from "../src/profile";

const b64url = (o: object) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("profileFromClaims", () => {
  it("maps MyDigital ID claims", () => {
    const p = profileFromClaims({
      nric: "900101015555",
      nama: "ALI BIN ABU",
      given_name: "Ali",
      family_name: "Abu",
      exp: 1_700_000_000,
    });
    expect(p).toMatchObject({
      nric: "900101015555",
      fullName: "ALI BIN ABU",
      givenName: "Ali",
      familyName: "Abu",
    });
    expect(p.expiresAt?.getTime()).toBe(1_700_000_000_000);
  });

  it("tolerates missing claims", () => {
    const p = profileFromClaims({});
    expect(p.nric).toBeUndefined();
    expect(p.expiresAt).toBeUndefined();
  });
});

describe("decodeJwt", () => {
  it("decodes a payload including unicode", () => {
    const token = `x.${b64url({ sub: "1", nama: "Ñandu" })}.y`;
    expect(decodeJwt(token)).toEqual({ sub: "1", nama: "Ñandu" });
  });
  it("returns null for garbage", () => {
    expect(decodeJwt("nope")).toBeNull();
  });
});
