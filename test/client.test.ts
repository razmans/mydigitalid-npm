import { beforeEach, describe, expect, it, vi } from "vitest";

const kc = vi.hoisted(() => ({
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  updateToken: vi.fn(),
  ctor: vi.fn(),
  state: {} as Record<string, unknown>,
}));

vi.mock("keycloak-js", () => ({
  default: class {
    constructor(cfg: unknown) {
      kc.ctor(cfg);
      return new Proxy(this, {
        get: (_t, k: string) =>
          k === "init" ? kc.init : k === "login" ? kc.login : k === "logout" ? kc.logout
          : k === "updateToken" ? kc.updateToken : kc.state[k],
      });
    }
  },
}));

import { MyDigitalIdClient } from "../src";

const cfg = { realm: "r", clientId: "c" };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  kc.state = {};
});

describe("MyDigitalIdClient", () => {
  it("requires realm and clientId", () => {
    expect(() => new MyDigitalIdClient({ realm: "", clientId: "c" })).toThrow(/realm/);
    expect(() => new MyDigitalIdClient({ realm: "r", clientId: "" })).toThrow(/clientId/);
  });

  it("uses the default SSO url and check-sso init", async () => {
    kc.init.mockResolvedValue(false);
    const client = new MyDigitalIdClient(cfg);
    expect(kc.ctor).toHaveBeenCalledWith({ url: "https://sso.digital-id.my", realm: "r", clientId: "c" });
    await expect(client.init()).resolves.toBe(false);
    expect(kc.init).toHaveBeenCalledWith(
      expect.objectContaining({ onLoad: "check-sso", checkLoginIframe: true }),
    );
  });

  it("init is idempotent", async () => {
    kc.init.mockResolvedValue(false);
    const client = new MyDigitalIdClient(cfg);
    await Promise.all([client.init(), client.init()]);
    expect(kc.init).toHaveBeenCalledTimes(1);
  });

  it("persists and restores a session when enabled", async () => {
    const exp = Math.floor(Date.now() / 1000) + 600;
    kc.state = { token: "t", refreshToken: "r", idToken: "i", idTokenParsed: { exp, nric: "1" } };
    kc.init.mockResolvedValue(true);
    await new MyDigitalIdClient({ ...cfg, persistSession: true }).init();
    expect(sessionStorage.getItem("mydigitalid.session")).toBeTruthy();

    kc.init.mockClear();
    await new MyDigitalIdClient({ ...cfg, persistSession: true }).init();
    expect(kc.init).toHaveBeenCalledWith(
      expect.objectContaining({ token: "t", refreshToken: "r", idToken: "i" }),
    );
  });

  it("ignores expired persisted sessions", async () => {
    sessionStorage.setItem("mydigitalid.session", JSON.stringify({ token: "old", exp: Date.now() - 1 }));
    kc.init.mockResolvedValue(false);
    await new MyDigitalIdClient({ ...cfg, persistSession: true }).init();
    expect(kc.init.mock.calls[0]![0].token).toBeUndefined();
  });

  it("does not persist by default", async () => {
    kc.state = { idTokenParsed: { exp: Math.floor(Date.now() / 1000) + 600 } };
    kc.init.mockResolvedValue(true);
    await new MyDigitalIdClient(cfg).init();
    expect(sessionStorage.length).toBe(0);
  });

  it("logout clears the stored session", async () => {
    sessionStorage.setItem("mydigitalid.session", "{}");
    await new MyDigitalIdClient({ ...cfg, persistSession: true }).logout();
    expect(sessionStorage.getItem("mydigitalid.session")).toBeNull();
    expect(kc.logout).toHaveBeenCalled();
  });

  it("refreshToken forwards minValidity", async () => {
    kc.updateToken.mockResolvedValue(true);
    await expect(new MyDigitalIdClient(cfg).refreshToken(-1)).resolves.toBe(true);
    expect(kc.updateToken).toHaveBeenCalledWith(-1);
  });
});
