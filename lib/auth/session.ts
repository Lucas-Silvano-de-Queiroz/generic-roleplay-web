import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { TokenPair } from "@/lib/api/contracts";

const MAX_SESSION_AGE_MS = 15 * 24 * 60 * 60 * 1000;
const MAX_COOKIE_VALUE_BYTES = 3800;
const COOKIE_AAD = "generic-roleplay:web-session:v1";
const COOKIE_VERSION = 1;

export type WebSession = { tokens: TokenPair; expiresAt: number };
export type SessionContext = { expiresAt: string };

export const sessionCookieName = () => process.env.NODE_ENV === "production" ? "__Host-grp-session" : "grp-session";

function encryptionKey(): Buffer {
  const encodedKey = process.env.WEB_SESSION_COOKIE_ENCRYPTION_KEY;
  if (!encodedKey) throw new Error("WEB_SESSION_COOKIE_ENCRYPTION_KEY is required");
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("WEB_SESSION_COOKIE_ENCRYPTION_KEY must be 32 bytes encoded as Base64");
  return key;
}

export function getTokenExpiry(token: string): number | null {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;
    const payload: unknown = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (typeof payload !== "object" || payload === null || typeof (payload as { exp?: unknown }).exp !== "number") return null;
    const expiry = (payload as { exp: number }).exp * 1000;
    return Number.isFinite(expiry) && expiry > 0 ? expiry : null;
  } catch {
    return null;
  }
}

export function encryptWebSession(session: WebSession): string {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), initializationVector);
  cipher.setAAD(Buffer.from(COOKIE_AAD));
  const plaintext = Buffer.from(JSON.stringify({ version: COOKIE_VERSION, ...session }), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();
  const encryptedValue = Buffer.concat([initializationVector, authenticationTag, ciphertext]).toString("base64url");
  if (Buffer.byteLength(encryptedValue, "utf8") > MAX_COOKIE_VALUE_BYTES) {
    throw new Error("Encrypted session exceeds the browser cookie size limit");
  }
  return encryptedValue;
}

export function decryptWebSession(value: string | undefined): WebSession | null {
  if (!value || Buffer.byteLength(value, "utf8") > MAX_COOKIE_VALUE_BYTES) return null;
  try {
    const encryptedBytes = Buffer.from(value, "base64url");
    if (encryptedBytes.length <= 28) return null;
    const initializationVector = encryptedBytes.subarray(0, 12);
    const authenticationTag = encryptedBytes.subarray(12, 28);
    const ciphertext = encryptedBytes.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), initializationVector);
    decipher.setAAD(Buffer.from(COOKIE_AAD));
    decipher.setAuthTag(authenticationTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const parsed: unknown = JSON.parse(plaintext);
    if (typeof parsed !== "object" || parsed === null) return null;
    const payload = parsed as { version?: unknown; expiresAt?: unknown; tokens?: Partial<TokenPair> };
    if (payload.version !== COOKIE_VERSION || typeof payload.expiresAt !== "number" || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    if (typeof payload.tokens?.accessToken !== "string" || typeof payload.tokens.refreshToken !== "string" || payload.tokens.tokenType !== "Bearer") return null;
    return { tokens: { accessToken: payload.tokens.accessToken, refreshToken: payload.tokens.refreshToken, tokenType: "Bearer" }, expiresAt: payload.expiresAt };
  } catch (error) {
    if (error instanceof Error && error.message.includes("WEB_SESSION_COOKIE_ENCRYPTION_KEY")) throw error;
    return null;
  }
}

export function sessionCookieOptions(expiresAt: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", expires: new Date(expiresAt) };
}

export async function createWebSession(tokens: TokenPair): Promise<void> {
  const refreshExpiresAt = getTokenExpiry(tokens.refreshToken);
  if (refreshExpiresAt === null) throw new Error("Refresh token has no valid expiry");
  const expiresAt = Math.min(refreshExpiresAt, Date.now() + MAX_SESSION_AGE_MS);
  if (expiresAt <= Date.now()) throw new Error("Refresh token is already expired");
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), encryptWebSession({ tokens, expiresAt }), sessionCookieOptions(expiresAt));
}

export async function readWebSession(): Promise<WebSession | null> {
  const cookieValue = (await cookies()).get(sessionCookieName())?.value;
  return decryptWebSession(cookieValue);
}

export async function requireSession(): Promise<SessionContext> {
  const session = await readWebSession();
  if (!session) redirect("/login?next=%2Fsystems");
  return { expiresAt: new Date(session.expiresAt).toISOString() };
}

export async function redirectAuthenticatedUser(): Promise<void> {
  if (await readWebSession()) redirect("/systems");
}

export async function destroyWebSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(), "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
