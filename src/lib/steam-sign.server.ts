// HMAC-signed state for the Steam OpenID link flow (server-only).
const enc = new TextEncoder();

async function key() {
  const secret = process.env["STEAM_LINK_SECRET"];
  if (!secret) throw new Error("STEAM_LINK_SECRET missing");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function signState(userId: string) {
  const payload = `${userId}.${Date.now() + 10 * 60 * 1000}`;
  const sig = b64(await crypto.subtle.sign("HMAC", await key(), enc.encode(payload)));
  return `${payload}.${sig}`;
}

export async function verifyState(state: string): Promise<string | null> {
  const [uid, exp, sig] = state.split(".");
  if (!uid || !exp || !sig || Number(exp) < Date.now()) return null;
  const expected = b64(await crypto.subtle.sign("HMAC", await key(), enc.encode(`${uid}.${exp}`)));
  if (expected.length !== sig.length) return null;
  let diff = 0; for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? uid : null;
}
