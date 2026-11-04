import { EncryptJWT, jwtDecrypt } from "jose"

export const SESSION_COOKIE = "qc_session"
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export interface SessionTokens {
  accessToken: string
  refreshToken: string
  /** When the access token stops working, in milliseconds since the epoch. */
  expiresAt: number
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters. See .env.example.")
  return new TextEncoder().encode(value).slice(0, 32)
}

export function toSession(tokens: TokenResponse): SessionTokens {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  }
}

/** The tokens are encrypted, not just signed, so the browser cannot read them. */
export async function sealSession(tokens: SessionTokens) {
  return new EncryptJWT({ ...tokens })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .encrypt(secret())
}

export async function openSession(cookie?: string): Promise<SessionTokens | null> {
  if (!cookie) return null
  try {
    const { payload } = await jwtDecrypt(cookie, secret())
    return {
      accessToken: payload.accessToken as string,
      refreshToken: payload.refreshToken as string,
      expiresAt: payload.expiresAt as number,
    }
  } catch {
    return null
  }
}

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "false",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
})
