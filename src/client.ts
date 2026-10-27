import Keycloak from "keycloak-js";
import type { KeycloakInitOptions } from "keycloak-js";
import { profileFromClaims } from "./profile";
import {
  DEFAULT_SSO_URL,
  type LoginOptions,
  type LogoutOptions,
  type MyDigitalIdConfig,
  type MyDigitalIdProfile,
  type MyDigitalIdTokens,
} from "./types";

interface StoredSession extends MyDigitalIdTokens {
  idTokenParsed?: Keycloak["idTokenParsed"];
  /** Expiry in ms since epoch. */
  exp: number;
}

const DEFAULT_STORAGE_KEY = "mydigitalid.session";

function safeStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Browser client for MyDigital ID SSO. */
export class MyDigitalIdClient {
  /** Underlying keycloak-js instance, for advanced use. */
  readonly keycloak: Keycloak;

  private readonly config: MyDigitalIdConfig;
  private initPromise?: Promise<boolean>;

  constructor(config: MyDigitalIdConfig) {
    if (!config.realm) throw new Error("MyDigitalIdClient: `realm` is required");
    if (!config.clientId) throw new Error("MyDigitalIdClient: `clientId` is required");
    this.config = config;
    this.keycloak = new Keycloak({
      url: config.url ?? DEFAULT_SSO_URL,
      realm: config.realm,
      clientId: config.clientId,
    });
  }

  /**
   * Run check-sso and restore any persisted session.
   * Safe to call more than once; resolves to whether the user is authenticated.
   */
  init(): Promise<boolean> {
    this.initPromise ??= this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<boolean> {
    const options: KeycloakInitOptions = {
      onLoad: "check-sso",
      checkLoginIframe: this.config.checkLoginIframe ?? true,
    };
    const silent =
      this.config.silentCheckSsoRedirectUri ??
      (typeof location !== "undefined" ? `${location.origin}/checksso.html` : undefined);
    if (silent) options.silentCheckSsoRedirectUri = silent;

    const saved = this.loadSession();
    if (saved) {
      options.token = saved.token;
      options.refreshToken = saved.refreshToken;
      options.idToken = saved.idToken;
    }

    const authenticated = await this.keycloak.init(options);
    if (authenticated) this.saveSession();
    else this.clearSession();
    return authenticated;
  }

  get authenticated(): boolean {
    return this.keycloak.authenticated === true;
  }

  get tokens(): MyDigitalIdTokens {
    const { token, refreshToken, idToken } = this.keycloak;
    return { token, refreshToken, idToken };
  }

  /** Profile from the ID token claims, or `null` when signed out. */
  getProfile(): MyDigitalIdProfile | null {
    const claims = this.keycloak.idTokenParsed;
    return claims ? profileFromClaims(claims) : null;
  }

  login(options: LoginOptions = {}): Promise<void> {
    return this.keycloak.login({ redirectUri: options.redirectUri });
  }

  logout(options: LogoutOptions = {}): Promise<void> {
    this.clearSession();
    return this.keycloak.logout({ redirectUri: options.redirectUri });
  }

  /**
   * Refresh the token if it expires within `minValidity` seconds
   * (default 30). Pass `-1` to force a refresh.
   * Resolves to `true` if the token was refreshed.
   */
  async refreshToken(minValidity = 30): Promise<boolean> {
    const refreshed = await this.keycloak.updateToken(minValidity);
    if (refreshed) this.saveSession();
    return refreshed;
  }

  private get storageKey(): string {
    return this.config.storageKey ?? DEFAULT_STORAGE_KEY;
  }

  private loadSession(): StoredSession | null {
    if (!this.config.persistSession) return null;
    const storage = safeStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(this.storageKey);
      if (!raw) return null;
      const session = JSON.parse(raw) as StoredSession;
      if (typeof session.exp !== "number" || session.exp <= Date.now()) {
        storage.removeItem(this.storageKey);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  private saveSession(): void {
    if (!this.config.persistSession) return;
    const storage = safeStorage();
    const exp = this.keycloak.idTokenParsed?.exp;
    if (!storage || typeof exp !== "number") return;
    const session: StoredSession = {
      ...this.tokens,
      idTokenParsed: this.keycloak.idTokenParsed,
      exp: exp * 1000,
    };
    try {
      storage.setItem(this.storageKey, JSON.stringify(session));
    } catch {
      /* storage full or blocked */
    }
  }

  private clearSession(): void {
    try {
      safeStorage()?.removeItem(this.storageKey);
    } catch {
      /* ignore */
    }
  }
}

/** Convenience factory: create a client and run `init()`. */
export async function createMyDigitalIdClient(
  config: MyDigitalIdConfig,
): Promise<MyDigitalIdClient> {
  const client = new MyDigitalIdClient(config);
  await client.init();
  return client;
}
