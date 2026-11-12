import "server-only"
import { cache } from "react"
import { cookies, headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { openSession, SESSION_COOKIE } from "@/lib/auth/session"
import { API_BASE, siteHeaders } from "@/lib/frappe/config"
import type { Me, PayInfo, VerifyResult } from "@/lib/frappe/types"

export class FrappeError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

/** Turn Frappe's error envelope into the sentence meant for the person using the app. */
export function errorMessage(body: Record<string, unknown>, status: number) {
  try {
    const messages = JSON.parse((body._server_messages as string) ?? "[]") as string[]
    const text = messages
      .map((m) => (JSON.parse(m) as { message?: string }).message)
      .filter(Boolean)
      .join(" ")
      .replace(/<[^>]+>/g, "")
    if (text) return text
  } catch {
    // Not the usual envelope, so fall through.
  }
  if (status === 403) return "Your role does not include this."
  if (status === 401) return "Please sign in again."
  return "Something went wrong. Please try again."
}

interface CallOptions {
  params?: Record<string, string | number | undefined | null>
  body?: Record<string, unknown>
}

/** The company the person picked in the switcher. Frappe checks they may use it. */
export const COMPANY_COOKIE = "qc_company"

async function chosenCompany() {
  try {
    return (await cookies()).get(COMPANY_COOKIE)?.value
  } catch {
    return undefined
  }
}

async function call<T>(endpoint: string, { params, body }: CallOptions, token?: string): Promise<T> {
  const company = token ? await chosenCompany() : undefined
  const url = new URL(`${API_BASE}.${endpoint}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value))
  }
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: {
      ...siteHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(company ? { "X-QC-Company": company } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) throw new FrappeError(errorMessage(json, response.status), response.status)
  return json.message as T
}

async function accessToken() {
  const session = await openSession((await cookies()).get(SESSION_COOKIE)?.value)
  return session?.accessToken
}

/** Call the API as the signed-in person, so Frappe applies their roles. */
export async function api<T>(endpoint: string, options: CallOptions = {}): Promise<T> {
  const token = await accessToken()
  if (!token) redirect("/session/end")
  try {
    return await call<T>(endpoint, options, token)
  } catch (error) {
    // A revoked token and a refused role both come back as 403, so ask who Frappe thinks this is.
    if (error instanceof FrappeError && (error.status === 401 || error.status === 403) && endpoint !== "me") {
      const stillSignedIn = await call<Me>("me", {}, token).catch(() => null)
      if (!stillSignedIn) redirect("/session/end")
      // A form shows the refusal itself. A page has nothing to show, so explain instead.
      if (!options.body) redirect("/no-access")
    }
    if (error instanceof FrappeError && error.status === 404 && !options.body) notFound()
    throw error
  }
}

export const getMe = cache(async () => {
  const token = await accessToken()
  if (!token) redirect("/session/end")
  try {
    return await call<Me>("me", {}, token)
  } catch (error) {
    if (error instanceof FrappeError && (error.status === 401 || error.status === 403)) redirect("/session/end")
    throw error
  }
})

/** The public certificate check. It needs no sign-in, and passes on who is asking for the rate limit. */
export async function verifyCertificate(code: string): Promise<VerifyResult> {
  const url = new URL(`${API_BASE}.verify_certificate`)
  url.searchParams.set("code", code)
  const forwarded = (await headers()).get("x-forwarded-for")
  const response = await fetch(url, { cache: "no-store", headers: { ...siteHeaders, ...(forwarded ? { "X-Forwarded-For": forwarded } : {}) } })
  if (!response.ok) throw new FrappeError("The certificate check isn't available right now.", response.status)
  return ((await response.json()) as { message: VerifyResult }).message
}

/** The public Pay Now page. The random code in the link is the only way in. */
export async function getPayInfo(code: string): Promise<PayInfo> {
  const url = new URL(`${API_BASE}.pay_info`)
  url.searchParams.set("code", code)
  const forwarded = (await headers()).get("x-forwarded-for")
  const response = await fetch(url, { cache: "no-store", headers: { ...siteHeaders, ...(forwarded ? { "X-Forwarded-For": forwarded } : {}) } })
  if (!response.ok) throw new FrappeError("This page isn't available right now.", response.status)
  return ((await response.json()) as { message: PayInfo }).message
}
