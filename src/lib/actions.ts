"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { cookieOptions, openSession, sealSession, SESSION_COOKIE, toSession, type TokenResponse } from "@/lib/auth/session"
import { api, errorMessage, FrappeError } from "@/lib/frappe/client"
import { API_BASE, siteHeaders } from "@/lib/frappe/config"

export type ActionResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string }
export type FormValues = Record<string, string | number | boolean | null | undefined>

export interface SearchHit {
  group: string
  title: string
  detail: string
  name: string
  path: string
}

/** Sign-in and reset calls come from this server, so tell Frappe's rate limits who is really asking. */
async function guestCall(endpoint: string, body: Record<string, unknown>) {
  const forwarded = (await headers()).get("x-forwarded-for")
  const response = await fetch(`${API_BASE}.${endpoint}`, {
    method: "POST",
    cache: "no-store",
    headers: { ...siteHeaders, "Content-Type": "application/json", ...(forwarded ? { "X-Forwarded-For": forwarded } : {}) },
    body: JSON.stringify(body),
  })
  return { response, json: (await response.json().catch(() => ({}))) as Record<string, unknown> }
}

async function run<T>(endpoint: string, body: Record<string, unknown>): Promise<ActionResult<T>> {
  try {
    const data = await api<T>(endpoint, { body })
    revalidatePath("/", "layout")
    return { ok: true, data }
  } catch (error) {
    if (error instanceof FrappeError) return { ok: false, error: error.message }
    throw error // Includes Next's redirects, which must carry on.
  }
}

/** Blank optional fields should reach Frappe as missing, not as empty text. */
function clean(values: FormValues) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "" && value !== undefined))
}

export async function signIn(_: string | null, form: FormData): Promise<string | null> {
  const usr = String(form.get("email") ?? "").trim()
  const pwd = String(form.get("password") ?? "")
  const next = String(form.get("next") ?? "")
  if (!usr || !pwd) return "Enter your email and password."
  let tokens: TokenResponse | undefined
  try {
    const { response, json } = await guestCall("login", { usr, pwd })
    if (response.status === 401) return "Incorrect email or password."
    if (!response.ok) return errorMessage(json, response.status)
    tokens = json.tokens as TokenResponse
  } catch {
    return "The system can't be reached right now. Please try again shortly."
  }
  ;(await cookies()).set(SESSION_COOKIE, await sealSession(toSession(tokens)), cookieOptions())
  // Only ever return to a page on this site.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard")
}

export async function signOut() {
  const store = await cookies()
  const session = await openSession(store.get(SESSION_COOKIE)?.value)
  if (session) {
    await fetch(`${API_BASE}.logout`, {
      method: "POST",
      headers: { ...siteHeaders, Authorization: `Bearer ${session.accessToken}` },
    }).catch(() => null)
  }
  store.delete(SESSION_COOKIE)
  redirect("/login")
}

export async function forgotPassword(_: { sent?: boolean; error?: string } | null, form: FormData) {
  const email = String(form.get("email") ?? "").trim()
  if (!email) return { error: "Enter your email address." }
  try {
    const { response } = await guestCall("forgot_password", { email })
    if (response.status === 429) return { error: "Too many requests. Please try again later." }
    if (!response.ok) return { error: "The system can't be reached right now. Please try again shortly." }
    return { sent: true }
  } catch {
    return { error: "The system can't be reached right now. Please try again shortly." }
  }
}

export async function resetPassword(key: string, newPassword: string): Promise<ActionResult> {
  try {
    const { response, json } = await guestCall("reset_password", { key, new_password: newPassword })
    if (response.status === 429) return { ok: false, error: "Too many attempts. Please try again later." }
    if (!response.ok) return { ok: false, error: errorMessage(json, response.status) }
    return { ok: true, data: null }
  } catch {
    return { ok: false, error: "The system can't be reached right now. Please try again shortly." }
  }
}

export const changePassword = async (oldPassword: string, newPassword: string) =>
  run("change_password", { old_password: oldPassword, new_password: newPassword })

export async function signOutEverywhere(): Promise<ActionResult> {
  const result = await run("sign_out_everywhere", {})
  if (!result.ok) return result
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect("/login")
}

export async function searchRecords(query: string) {
  return api<SearchHit[]>("search", { params: { query } }).catch(() => [])
}

export type PayStatus = { status: "Sent" | "Paid" | "Failed" | "Unknown"; receipt?: string; balance?: number }

export async function payRequest(code: string, phone: string, amount: number): Promise<ActionResult<{ reference: string }>> {
  try {
    const { response, json } = await guestCall("pay_request", { code, phone, amount })
    if (response.status === 429) return { ok: false, error: "Too many attempts. Please try again later, or pay by Paybill." }
    if (!response.ok) return { ok: false, error: errorMessage(json, response.status) }
    return { ok: true, data: json.message as { reference: string } }
  } catch {
    return { ok: false, error: "We couldn't reach the payment system. Please try again shortly." }
  }
}

export async function payStatus(code: string, reference: string): Promise<PayStatus> {
  try {
    const url = new URL(`${API_BASE}.pay_status`)
    url.searchParams.set("code", code)
    url.searchParams.set("reference", reference)
    const response = await fetch(url, { cache: "no-store", headers: siteHeaders })
    return response.ok ? (((await response.json()) as { message: PayStatus }).message) : { status: "Unknown" }
  } catch {
    return { status: "Unknown" }
  }
}

export interface ImportPreview {
  token: string
  total: number
  ready: number
  problems: { row: number; name: string; type: "error" | "duplicate"; message: string }[]
}

export interface ImportResult {
  created: number
  failed: { row: number; name: string; message: string }[]
}

export async function previewImport(form: FormData): Promise<ActionResult<ImportPreview>> {
  const file = form.get("file")
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose a file first." }
  const content = Buffer.from(await file.arrayBuffer()).toString("base64")
  return run<ImportPreview>("import_preview", { kind: form.get("kind"), filename: file.name, content })
}

export const commitImport = async (kind: string, token: string) => run<ImportResult>("import_commit", { kind, token })
export const sendInvite = async (user: string) => run("send_invite", { user })

export async function lookup(kind: string, search: string) {
  return api<{ name: string; label?: string; outstanding_amount?: number; standard_rate?: number }[]>("lookup", {
    params: { kind, search },
  }).catch(() => [])
}

export const saveTrainee = async (values: FormValues) => run<string>("save_trainee", { data: clean(values) })
export const createTraineeCustomer = async (name: string) => run<string>("create_trainee_customer", { name })
export const saveBatch = async (values: FormValues) => run<string>("save_batch", { data: clean(values) })
export const addBatchTrainee = async (batch: string, values: FormValues) => run("add_batch_trainee", { batch, ...clean(values) })
export const setTraineeCompleted = async (batch: string, row: string, completed: boolean) =>
  run("update_batch_trainee", { batch, row, completed: completed ? 1 : 0 })
export const removeBatchTrainee = async (batch: string, row: string) => run("remove_batch_trainee", { batch, row })
export const createBatchInvoices = async (name: string) => run<string[]>("create_batch_invoices", { name })
export const requestBatchCertificates = async (name: string) => run<string[]>("request_batch_certificates", { name })
export const certificateAction = async (name: string, action: string) => run("certificate_action", { name, action })
export const saveTractorLog = async (values: FormValues) => run<string>("save_tractor_log", { data: clean(values) })
export const createTractorInvoice = async (name: string) => run<string>("create_tractor_invoice", { name })
export const createCustomer = async (values: FormValues) => run<string>("create_customer", clean(values))
export const submitInvoice = async (name: string) => run("submit_invoice", { name })
export const recordPayment = async (invoice: string, values: FormValues) => run("record_payment", { invoice, ...clean(values) })
export const requestMpesa = async (invoice: string, values: FormValues) => run("request_mpesa", { invoice, ...clean(values) })
export const retryEtims = async (invoice: string) => run("retry_etims", { invoice })
export const allocateMpesa = async (payment: string, values: FormValues) => run("allocate_mpesa", { payment, ...clean(values) })
export const createBill = async (values: FormValues) => run<{ name: string }>("create_bill", clean(values))
export const submitBill = async (name: string) => run("submit_bill", { name })
export const payBill = async (bill: string, values: FormValues) => run("pay_bill", { bill, ...clean(values) })
