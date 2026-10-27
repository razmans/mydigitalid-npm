import { MyDigitalIdClient } from "mydigitalid-sso";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const KEY = "mydigitalid.playground";

const log = (msg: string, data?: unknown) => {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}${data === undefined ? "" : " " + JSON.stringify(data, null, 2)}`;
  $("log").textContent = line + "\n" + $("log").textContent;
  console.log(msg, data);
};

interface Saved { realm: string; clientId: string; url: string; persist: boolean }
const saved: Saved = (() => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
})();

$("origin").textContent = location.origin;
$<HTMLInputElement>("realm").value = saved.realm ?? "";
$<HTMLInputElement>("clientId").value = saved.clientId ?? "";
$<HTMLInputElement>("url").value = saved.url ?? "";
$<HTMLInputElement>("persist").checked = saved.persist ?? false;

let client: MyDigitalIdClient | undefined;

function render() {
  const authed = client?.authenticated ?? false;
  const p = client?.getProfile();
  $("status").textContent = !client ? "Not initialised" : authed ? "Logged in" : "Not logged in";
  $("nric").textContent = p?.nric ?? "-";
  $("fullName").textContent = p?.fullName ?? "-";
  $("givenName").textContent = p?.givenName ?? "-";
  $("familyName").textContent = p?.familyName ?? "-";
  $("expiresAt").textContent = p?.expiresAt?.toString() ?? "-";
  $<HTMLButtonElement>("login").disabled = !client || authed;
  $<HTMLButtonElement>("refresh").disabled = !authed;
  $<HTMLButtonElement>("claims").disabled = !authed;
  $<HTMLButtonElement>("logout").disabled = !authed;
}

async function start() {
  const realm = $<HTMLInputElement>("realm").value.trim();
  const clientId = $<HTMLInputElement>("clientId").value.trim();
  if (!realm || !clientId) { log("Enter a realm and client ID first"); render(); return; }
  const url = $<HTMLInputElement>("url").value.trim() || undefined;
  const persistSession = $<HTMLInputElement>("persist").checked;
  try {
    client = new MyDigitalIdClient({ realm, clientId, url, persistSession });
    log("init...", { realm, clientId, url, persistSession });
    const ok = await client.init();
    log(ok ? "authenticated" : "not authenticated");
  } catch (e) {
    log("init failed", String(e));
  }
  render();
}

$("save").addEventListener("click", () => {
  const s: Saved = {
    realm: $<HTMLInputElement>("realm").value.trim(),
    clientId: $<HTMLInputElement>("clientId").value.trim(),
    url: $<HTMLInputElement>("url").value.trim(),
    persist: $<HTMLInputElement>("persist").checked,
  };
  localStorage.setItem(KEY, JSON.stringify(s));
  location.reload();
});
$("login").addEventListener("click", () => client?.login().catch((e) => log("login failed", String(e))));
$("logout").addEventListener("click", () => client?.logout().catch((e) => log("logout failed", String(e))));
$("refresh").addEventListener("click", async () => {
  try {
    log("refreshed:", await client!.refreshToken(-1));
    render();
  } catch (e) {
    log("refresh failed", String(e));
  }
});
$("claims").addEventListener("click", () => log("claims", client?.getProfile()?.claims));

if (saved.realm && saved.clientId) {
  void start();
} else {
  render();
}
