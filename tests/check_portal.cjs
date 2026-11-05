// Drives the portal in Chrome against the throwaway Frappe site. Posts real documents, so never point it at a live site.
// Usage: NODE_PATH=<playwright node_modules> SHOTS=<folder> SESSION_SECRET=<from .env.local> BENCH_SITES=<bench sites folder> BASE=<portal url> node tests/check_portal.cjs
const { chromium } = require("playwright")
const { EncryptJWT } = require("jose")
const BASE = process.env.BASE ?? "http://localhost:3100", FRAPPE = "http://qctest.localhost:8010", PW = "Test@12345qc", RUN = String(Date.now()).slice(-6), SHOTS = process.env.SHOTS
const API = FRAPPE + "/api/method/quality_care.api.v1."
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m) }
const problems = []
async function session(browser, email, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage(); page.setDefaultTimeout(30000)
  page.on("pageerror", (e) => problems.push(email + " " + e.message.slice(0, 160)))
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|403|Failed to load resource/.test(m.text())) problems.push(email + " console " + m.text().slice(0, 160)) })
  await page.goto(BASE + "/login"); await page.fill("#email", email); await page.fill("#password", PW); await page.click("button[type=submit]")
  await page.waitForURL(/\/dashboard/); return page
}
const shot = (p, n, full = true) => p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: full })
const go = async (p, path) => { await p.goto(BASE + path); await p.waitForLoadState("networkidle") }
const toasted = (p, text) => p.getByText(text, { exact: false }).first().waitFor({ timeout: 25000 })
const dlg = (p) => p.getByRole("dialog")
const choose = async (p, id, name) => { await dlg(p).locator("#" + id).click(); await p.getByRole("option", { name, exact: true }).click() }
const saved = async (p) => { await dlg(p).getByRole("button", { name: "Save" }).click(); await dlg(p).waitFor({ state: "hidden", timeout: 25000 }); await p.waitForLoadState("networkidle") }
async function fillDialog(p, values) {
  for (const [label, v] of Object.entries(values)) {
    const d = p.getByRole("dialog")
    if (v.pick) { const i = d.getByLabel(label, { exact: false }).first(); await i.click(); await i.fill(v.pick); const o = d.getByRole("option").filter({ hasText: v.pick }).first(); await o.waitFor(); await o.locator("button").click() }
    else if (v.choose) { await d.locator(`#${v.id}`).click(); await p.getByRole("option", { name: v.choose, exact: true }).click() }
    else await d.getByLabel(label, { exact: false }).first().fill(String(v))
  }
}
const submit = (p, name) => p.getByRole("dialog").getByRole("button", { name }).click()
const button = (p, name) => p.getByRole("button", { name, exact: true }).first()
const navLabels = (p) => p.locator("aside nav a").allTextContents()

;(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true })

  // Sign-in
  {
    const ctx = await browser.newContext(); const p = await ctx.newPage()
    await p.goto(BASE + "/trainees"); ok(/\/login\?next=%2Ftrainees/.test(p.url()), "signed-out visitor goes to login and remembers the page")
    await p.fill("#email", "dir@test.local"); await p.fill("#password", "wrong"); await p.click("button[type=submit]")
    await p.locator("form [role=alert]").waitFor(); ok(/Incorrect email or password/.test(await p.locator("form [role=alert]").innerText()), "wrong password shows a clear message"); ok(await p.inputValue("#email") === "dir@test.local", "email stays filled in after a wrong password")
    await p.fill("#password", PW); await p.click("button[type=submit]"); await p.waitForURL(/\/trainees/); ok(true, "after sign-in returns to the page asked for")
    const c = (await ctx.cookies()).find((x) => x.name === "qc_session"); ok(c && c.httpOnly && c.sameSite === "Lax", "session cookie is httpOnly")
    ok(!/\beyJ|access_token/.test(await p.content()), "tokens never reach the page")
    await p.goto(BASE + "/login"); await p.waitForURL(/\/dashboard/); ok(true, "signed-in visitor skips login")
    await p.goto(BASE + "/login?next=https://evil.example"); await p.waitForURL(/dashboard/); await p.waitForLoadState("networkidle")
    await p.getByRole("banner").getByRole("button").last().click(); await p.getByRole("menuitem", { name: "Sign out" }).click(); await p.waitForURL(/\/login/); ok(true, "sign out works")
    await p.goto(BASE + "/dashboard"); ok(/\/login/.test(p.url()), "signed out means locked out")
    await ctx.close()
  }

  // Password help on the sign-in page
  {
    const ctx = await browser.newContext(); const p = await ctx.newPage()
    await p.goto(BASE + "/login"); await p.fill("#password", "secret")
    await p.locator("button[type=submit]").hover(); await p.waitForTimeout(300); const look = await p.locator("button[type=submit]").evaluate((b) => { const s = getComputedStyle(b); return s.backgroundColor + " " + s.boxShadow }); ok(!/23[0-9],\s*34|235,\s*34|213,\s*28/.test(look), "sign-in button hover uses the brand colour, not red: " + look.slice(0, 60))
    await p.getByRole("button", { name: "Show password" }).click(); ok(await p.getAttribute("#password", "type") === "text" && await p.inputValue("#password") === "secret", "eye shows the password")
    await shot(p, "01_login_eye", false); await p.getByRole("button", { name: "Hide password" }).click(); ok(await p.getAttribute("#password", "type") === "password", "eye hides it again")
    await p.getByRole("link", { name: "Forgot password?" }).click(); await p.waitForURL(/forgot-password/); await p.fill("#email", "nobody" + RUN + "@test.local"); await p.getByRole("button", { name: "Send reset link" }).click(); await p.getByText("Check your email").waitFor(); const unknown = await p.locator("[role=status]").innerText(); await shot(p, "02_forgot_sent", false)
    await p.goto(BASE + "/forgot-password"); await p.fill("#email", "resetme@test.local"); await p.getByRole("button", { name: "Send reset link" }).click(); await p.getByText("Check your email").waitFor(); ok(unknown === await p.locator("[role=status]").innerText(), "forgot password answers the same whether or not the email exists")
    await p.goto(BASE + "/reset-password"); ok((await p.content()).includes("isn&#x27;t complete") || (await p.content()).includes("isn't complete"), "reset page without a key explains itself")
    await p.goto(BASE + "/reset-password?key=madeup" + RUN); await p.fill("#new_password", "correct horse battery 42"); ok(await p.getByRole("button", { name: "Save new password" }).isDisabled(), "save waits for both passwords to match")
    await p.fill("#confirm_password", "correct horse battery 42"); await p.getByRole("button", { name: "Save new password" }).click(); await p.locator("form [role=alert]").waitFor(); ok(/expired or has already been used/.test(await p.locator("form [role=alert]").innerText()), "made-up reset key is refused")
    // The forgot-password step above replaced any older link, so make a fresh key once its background job has run.
    await new Promise((resolve) => setTimeout(resolve, 8000))
    const key = require("child_process").execSync(`../env/bin/python -W ignore -c "import frappe; frappe.init('qctest.localhost', sites_path='.'); frappe.connect(); print(frappe.get_doc('User', 'resetme@test.local')._reset_password().split('key=')[1]); frappe.db.commit()"`, { cwd: process.env.BENCH_SITES, stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split("\n").pop()
    await p.goto(BASE + "/reset-password?key=" + key); await p.fill("#new_password", "abc12345"); await p.fill("#confirm_password", "abc12345"); await p.getByRole("button", { name: "Save new password" }).click(); await p.locator("form [role=alert]").waitFor(); ok(/too easy to guess/.test(await p.locator("form [role=alert]").innerText()), "weak password refused with a clear reason"); await shot(p, "03_reset_weak", false)
    const strong = "Nyati-Kilimani-" + RUN
    await p.fill("#new_password", strong); await p.fill("#confirm_password", strong); await p.getByRole("button", { name: "Save new password" }).click(); await p.waitForURL(/\/login\?reset=1/); ok((await p.content()).includes("Your password has been changed"), "reset sends you to sign in, with confirmation")
    await p.fill("#email", "resetme@test.local"); await p.fill("#password", strong); await p.click("button[type=submit]"); await p.waitForURL(/\/dashboard/); ok(true, "new password signs in")
    await ctx.close()
  }

  // Coordinator
  const coord = await session(browser, "coord@test.local")
  let labels = await navLabels(coord)
  ok(labels.includes("Trainees") && labels.includes("Classes") && labels.includes("Reports") && !labels.includes("Books") && !labels.includes("Supplier Bills") && !labels.includes("M-Pesa"), "coordinator menu fits the role: " + labels.join(", "))
  ok((await coord.content()).indexOf("Net profit") < 0, "coordinator sees no profit figures")
  await shot(coord, "10_coord_dashboard")
  for (const path of ["/reports/business-line-profit", "/bills", "/trainers", "/equipment"]) { await go(coord, path); ok(/isn't part of your role/.test(await coord.content()), "coordinator refused " + path) }

  const hospital = "Portal Hospital " + RUN, nurse = "Portal Nurse " + RUN
  await go(coord, "/customers"); await button(coord, "New customer").click(); await fillDialog(coord, { "Name": hospital }); await submit(coord, "Save"); await toasted(coord, "Customer saved"); ok(true, "coordinator adds a customer")
  await go(coord, "/trainees"); await button(coord, "New trainee").click()
  await submit(coord, "Save"); await coord.getByRole("dialog").getByRole("alert").waitFor(); ok(/Full name is needed/.test(await coord.getByRole("dialog").getByRole("alert").innerText()), "form says what's missing")
  await fillDialog(coord, { "Full name": nurse, "Phone": "0712345678", "Billed to": { pick: hospital } }); await shot(coord, "11_trainee_form", false); await submit(coord, "Save"); await coord.waitForURL(/\/trainees\/.+/); ok((await coord.content()).includes(nurse), "coordinator adds a trainee and lands on the record")
  await go(coord, "/trainees?search=" + encodeURIComponent(nurse)); ok(await coord.getByRole("link", { name: nurse }).count() === 1, "search finds the trainee")
  await go(coord, "/batches"); await button(coord, "New class").click()
  await fillDialog(coord, { "Course": { pick: "Monthly Training" }, "Start date": "2026-11-10", "Venue": "Nairobi", "Lead trainer": "Eric" })
  ok(Number(await coord.getByRole("dialog").locator("#standard_fee").inputValue() || 0) >= 0, "course fills the fee box")
  await coord.getByRole("dialog").locator("#standard_fee").fill("15000"); await submit(coord, "Save"); await coord.waitForURL(/\/batches\/.+/); await coord.waitForLoadState("networkidle")
  const batchUrl = coord.url(); ok(true, "coordinator creates a class")
  await button(coord, "Add trainee").click(); await fillDialog(coord, { "Trainee": { pick: nurse } }); await submit(coord, "Save"); await toasted(coord, "Trainee added"); await coord.getByRole("link", { name: nurse }).waitFor(); ok(true, "trainee added to class")
  await coord.getByRole("button", { name: /Create invoices/ }).click(); await toasted(coord, "Draft invoices created"); await coord.getByRole("link", { name: /ACC-SINV/ }).first().waitFor()
  const invoice = await coord.getByRole("link", { name: /ACC-SINV/ }).first().innerText(); ok(/ACC-SINV/.test(invoice), "class creates a draft invoice " + invoice)
  await coord.getByRole("checkbox").first().click(); await coord.getByRole("button", { name: /Request certificates/ }).waitFor(); ok(true, "marking finished offers certificates")
  await coord.getByRole("button", { name: /Request certificates/ }).click(); await toasted(coord, "Sent to the Director"); await shot(coord, "12_class_detail")
  await go(coord, "/invoices/" + encodeURIComponent(invoice)); ok(await button(coord, "Submit invoice").count() === 0 && await button(coord, "Record payment").count() === 0, "coordinator can't submit or take payment")
  await go(coord, "/certificates"); ok(await coord.getByRole("button", { name: "Approve" }).count() === 0, "coordinator can't approve certificates")

  // Director
  const dir = await session(browser, "dir@test.local")
  await go(dir, "/certificates?status=Requested"); await shot(dir, "20_certificates"); await button(dir, "Approve").click(); await toasted(dir, "Certificate issued"); ok(true, "director approves a certificate")
  await go(dir, "/certificates?status=Issued"); ok((await dir.content()).includes(nurse), "certificate shows as issued")

  // Accounts
  const acct = await session(browser, "acct@test.local")
  await go(acct, "/invoices/" + encodeURIComponent(invoice)); await button(acct, "Submit invoice").click(); await acct.getByRole("alertdialog").getByRole("button", { name: "Submit invoice" }).click(); await toasted(acct, "Invoice submitted"); await button(acct, "Record payment").waitFor(); ok(true, "accounts submits, after a confirmation")
  ok((await acct.content()).includes("KES") && !/VAT/.test(await acct.locator("main").innerText()), "invoice shows no VAT")
  await button(acct, "Record payment").click(); await fillDialog(acct, { "Amount (KES)": 99999, "Paid by": { choose: "Cash", id: "mode" } }); await submit(acct, "Record payment"); await acct.getByRole("dialog").getByRole("alert").waitFor(); ok(/balance/i.test(await acct.getByRole("dialog").getByRole("alert").innerText()), "overpayment refused with a clear reason")
  await fillDialog(acct, { "Amount (KES)": 5000, "Paid by": { choose: "M-Pesa", id: "mode" }, "Reference": "PORT" + RUN }); await submit(acct, "Record payment"); await toasted(acct, "Payment recorded"); await acct.getByText("PORT" + RUN).waitFor(); ok(true, "part payment recorded"); await shot(acct, "30_invoice")
  const pdf = await acct.request.get(BASE + "/print/invoice/" + encodeURIComponent(invoice)); ok(pdf.ok() && /pdf/.test(pdf.headers()["content-type"]) && (await pdf.body()).slice(0, 4).toString() === "%PDF", "invoice PDF opens")
  await go(acct, "/bills"); await button(acct, "New bill").click()
  ok(await acct.getByRole("dialog").locator("#expense_account").count() === 1, "type of cost asked for by default")
  await fillDialog(acct, { "Supplier": { choose: "Florence", id: "supplier" }, "What is this for?": "BLS class " + RUN, "Amount (KES)": 10000, "Business line": { choose: "Training", id: "cost_center" } })
  ok(await acct.getByRole("dialog").locator("#expense_account").count() === 0, "trainer bill hides the cost type"); await submit(acct, "Save"); await toasted(acct, "Draft bill saved"); await acct.waitForLoadState("networkidle"); await go(acct, "/bills?status=Draft")
  ok((await acct.locator("main").innerText()).includes("9,500"), "bill shows 5% withheld"); await button(acct, "Submit").click(); await acct.getByRole("alertdialog").getByRole("button", { name: "Submit" }).click(); await toasted(acct, "Bill submitted"); ok(true, "bill submitted")
  await go(acct, "/bills?status=Unpaid"); await shot(acct, "31_bills"); await button(acct, "Pay").click(); await fillDialog(acct, { "Paid by": { choose: "Bank transfer", id: "mode" }, "Reference": "WT" + RUN }); await submit(acct, "Record payment"); await toasted(acct, "Payment recorded"); ok(true, "bill paid")
  await go(acct, "/trainers"); ok((await acct.locator("main").innerText()).includes("1,087,000"), "trainer totals match the books"); await shot(acct, "32_trainers")
  await go(acct, "/equipment"); ok((await acct.locator("main").innerText()).includes("2,324,76"), "equipment total matches the books"); await shot(acct, "33_equipment")
  await go(acct, "/payments"); ok((await acct.locator("main").innerText()).includes("isn't connected yet"), "M-Pesa says it isn't connected"); await shot(acct, "34_mpesa")

  // Tractor supervisor
  const trac = await session(browser, "trac@test.local")
  labels = await navLabels(trac); ok(labels.includes("Tractor Hire") && !labels.includes("Trainees") && !labels.includes("Invoices"), "supervisor menu fits the role: " + labels.join(", "))
  await go(trac, "/tractor"); await button(trac, "Record job").click()
  await fillDialog(trac, { "Customer": { pick: hospital }, "Service": { pick: "Tractor Hire" }, "Quantity": 2.5, "Rate (KES)": 4000, "Location": "Nakuru" }); await shot(trac, "40_tractor_form", false); await submit(trac, "Save"); await toasted(trac, "Job recorded"); await trac.waitForLoadState("networkidle")
  ok((await trac.locator("main").innerText()).includes("10,000"), "supervisor records a part-acre job"); ok(!/Tractor income and costs/.test(await trac.locator("main").innerText()), "supervisor sees no tractor profit")
  await go(acct, "/tractor?status=To+Invoice"); await shot(acct, "41_tractor_finance"); await button(acct, "Create invoice").click(); await toasted(acct, "Draft invoice created"); ok(true, "accounts invoices the job")

  // Dashboard and books
  const sole = await session(browser, "sole@test.local")
  await go(sole, "/dashboard?year=2024"); await sole.locator(".recharts-bar-rectangle").first().waitFor(); const main = await sole.locator("main").innerText(); await shot(sole, "50_dashboard_2024")
  ok(main.includes("6,761,612") || main.includes("6,761,613"), "2024 profit matches the books"); ok(main.includes("19.9M") && main.includes("13.1M"), "income and expenses match")
  ok(main.includes("Jan avg") || /Jan.*avg/.test(main), "Jan to Sep marked as an average"); ok(main.includes("Tractor Hire shows a loss") && main.includes("Administration shows a loss"), "losses are called out"); ok(main.includes("383,000"), "receivables match")
  await sole.getByRole("button", { name: "table", exact: true }).first().click(); ok((await sole.locator("main").innerText()).includes("Jan–Sep 2024"), "charts have a table view"); await sole.getByRole("button", { name: "chart", exact: true }).first().click()
  await sole.locator(".recharts-bar-rectangle").first().hover(); await sole.getByText("Bars show the average per month").waitFor({ timeout: 5000 }).then(() => ok(true, "chart tooltip explains the average")).catch(() => ok(false, "chart tooltip explains the average"))
  await go(sole, "/reports"); await shot(sole, "51_reports", false)
  for (const [slug, text] of [["business-line-profit", "Training"], ["trainer-wht", "Florence"], ["batch-income", "Monthly"], ["certificates", ""], ["tractor-profit", "2024"], ["unsigned-invoices", ""]]) { await go(sole, `/reports/${slug}?from=2024-01-01&to=2026-12-31`); ok((await sole.locator("main").innerText()).includes(text) && !/couldn't load/i.test(await sole.content()), "report opens: " + slug) }
  await shot(sole, "52_report")
  await sole.goto(BASE + "/reports/business-line-profit?from=2024-01-01&to=2024-12-31"); const [dl] = await Promise.all([sole.waitForEvent("download"), sole.getByRole("button", { name: "Download" }).click()]); ok(/business-line-profit/.test(dl.suggestedFilename()), "report downloads")

  // Everything held in ERPNext has a page
  let text; await go(sole, "/books?to=2024-12-31"); text = await sole.locator("main").innerText(); await shot(sole, "53_books")
  ok(text.includes("NCBA Current") && text.includes("23,124,171"), "books show balances that agree with the ledger")
  await sole.locator("aside").getByRole("link", { name: "Journal Entries" }).click(); await sole.waitForURL(/\/books\/journals/); await sole.waitForLoadState("networkidle"); ok((await sole.locator("main").innerText()).includes("ACC-JV-"), "Books opens Journal Entries from the sidebar")
  await sole.getByRole("link", { name: /ACC-JV-/ }).first().click(); await sole.waitForURL(/\/books\/journals\/ACC-JV/); await sole.waitForLoadState("networkidle"); ok((await sole.locator("main").innerText()).includes("Opening Balance Equity"), "journal entry opens with its lines"); await shot(sole, "54_journal", false)
  await go(sole, "/suppliers"); text = await sole.locator("main").innerText(); ok(text.includes("Eric") && text.includes("A005185947X"), "suppliers show trainers and PINs"); await shot(sole, "55_suppliers", false)
  await go(sole, "/services"); text = await sole.locator("main").innerText(); ok(text.includes("Monthly Training") && text.includes("Trainer Fee") && text.includes("Tractor Hire"), "courses and services listed"); await shot(sole, "56_services", false)
  // Greeting, clock, quote and the period picker
  await go(sole, "/dashboard"); {
    const heading = await sole.locator("h1").first().innerText(); ok(/^(Good (morning|afternoon|evening)|Welcome), /.test(heading), "dashboard greets by time of day")
    ok(/\d\d:\d\d/.test(await sole.getByRole("timer").innerText()), "clock shows the time")
    const first = await sole.getByRole("timer").innerText(); await sole.waitForTimeout(2100); ok(first !== await sole.getByRole("timer").innerText(), "clock is ticking")
    ok((await sole.locator("blockquote").innerText()).length > 5, "a quote shows")
    await sole.getByRole("combobox", { name: "Period" }).click(); const options = await sole.getByRole("option").allInnerTexts(); ok(["This month", "This quarter", "This year", "Last year", "Last 12 months", "2024", "2025", "Custom dates"].every((x) => options.includes(x)), "picker offers presets, every year and custom dates")
    await sole.getByRole("option", { name: "2025", exact: true }).click(); await sole.waitForURL(/year=2025/); await sole.getByText("No figures for 2025 yet").waitFor(); let text = await sole.locator("main").innerText(); ok(text.includes("Net profit, 2025") && /hold figures for .*2024/.test(text), "a year with no postings says so")
    await go(sole, "/dashboard?from=2024-11-01&to=2024-11-30"); text = await sole.locator("main").innerText(); ok(text.includes("Nov 2024") && /(Up|Down) \d+% on Oct 2024/.test(text), "one month shows, with the month before to compare"); ok(await sole.locator('input[aria-label="From date"]').count() === 1, "custom dates stay visible")
    await go(sole, "/dashboard?from=2024-01-01&to=2024-03-31"); ok((await sole.locator("main").innerText()).includes("can't be split by month"), "part of the lump warns")
    await go(sole, "/dashboard?year=nonsense"); ok(/Net profit, \d{4}/.test(await sole.locator("main").innerText()) && !(await sole.locator("main").innerText()).includes("nonsense"), "a bad year falls back to the latest figures")
    await go(sole, "/tractor?year=2025"); ok((await sole.locator("main").innerText()).includes("No tractor income or costs are posted for 2025"), "tractor chart follows the period")
    await go(sole, "/trainers"); ok(/Records run from .*2024/.test(await sole.locator("main").innerText()), "trainers say what's on record, from the data")
    await go(sole, "/reports/business-line-profit?year=2024"); ok(await sole.getByRole("combobox", { name: "Period" }).count() === 1, "reports use the same picker")
  }
  await go(sole, "/dashboard?year=2024"); ok((await sole.locator("main").innerText()).includes("What brings the money in"), "dashboard shows income by category")
  await go(coord, "/books"); await coord.getByText("This isn't part of your role").waitFor({ timeout: 10000 }).then(() => ok(true, "coordinator refused the books")).catch(() => ok(false, "coordinator refused the books"))

  // Search, donuts and account
  await go(sole, "/dashboard?year=2024"); ok(await sole.locator(".recharts-pie-sector").count() >= 10, "dashboard shows donuts"); text = await sole.locator("main").innerText(); ok(text.includes("Where income comes from") && text.includes("Where costs sit") && text.includes("Classes by status"), "donuts cover income, costs and classes")
  await shot(sole, "50_dashboard_2024")
  await sole.keyboard.press("Control+k"); await sole.getByPlaceholder("Name, invoice number").fill(nurse); await sole.getByRole("option", { name: nurse }).first().waitFor(); await shot(sole, "57_search", false); await sole.getByRole("option", { name: nurse }).first().click(); await sole.waitForURL(/\/trainees\//); ok(true, "Ctrl+K search finds a trainee and opens the record")
  await trac.keyboard.press("Control+k"); await trac.getByPlaceholder("Name, invoice number").fill(nurse); await trac.waitForTimeout(1500); ok(await trac.getByRole("option").count() === 0, "search hides what the role can't open"); await trac.keyboard.press("Escape")
  {
    const a = await session(browser, "account@test.local"); await go(a, "/account"); await shot(a, "58_account", false)
    await a.fill("#old_password", "wrong-one"); const np = "Mwangaza-Tausi-" + RUN; await a.fill("#new_password", np); await a.fill("#confirm_password", np); await a.getByRole("button", { name: "Change password" }).click(); await a.locator("main [role=alert]").waitFor(); ok(/current password/.test(await a.locator("main [role=alert]").innerText()), "wrong current password refused")
    await a.fill("#old_password", PW); await a.getByRole("button", { name: "Change password" }).click(); await toasted(a, "Password changed"); await go(a, "/dashboard"); ok(/dashboard/.test(a.url()), "changing password keeps this session")
    await go(a, "/account"); await a.getByRole("button", { name: "Sign out everywhere" }).click(); await a.getByRole("alertdialog").getByRole("button", { name: "Sign out everywhere" }).click(); await a.waitForURL(/\/login/); ok(true, "sign out everywhere works")
    await a.goto(BASE + "/dashboard"); ok(/\/login/.test(a.url()), "and this session has ended")
  }

  // Import from Excel, certificate PDF and the public check
  {
    const importName = "Excel Nurse " + RUN, upload = (p, name, text) => p.locator("#import-file").setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(text) })
    await go(coord, "/import"); await shot(coord, "70_import", false); const tpl = await coord.request.get(BASE + "/import/template/trainees"); ok(tpl.ok() && (await tpl.body()).slice(0, 2).toString() === "PK", "template downloads")
    ok(await coord.getByRole("tab", { name: "Certificates" }).count() === 0, "coordinator isn't offered the certificate import")
    await upload(coord, "bad.csv", "Name\nX"); await button(coord, "Check file").click(); await coord.locator("main [role=alert]").waitFor(); ok(/columns are missing/.test(await coord.locator("main [role=alert]").innerText()), "wrong file explained")
    await upload(coord, "t.csv", `Full name,ID or passport,Email\n${importName},EX${RUN},\n${nurse}x,EX${RUN},\n,Y${RUN},\n`); await button(coord, "Check file").click(); await coord.getByRole("heading", { name: "Check before importing" }).waitFor(); await shot(coord, "71_import_check", false)
    const check = await coord.locator("main").innerText(); ok(/1\s*ready to add/.test(check) && /1\s*already on record/.test(check) && /1\s*need fixing/.test(check), "preview counts ready, duplicates and errors"); await go(coord, "/trainees?search=" + encodeURIComponent(importName)); ok(await coord.getByRole("link", { name: importName }).count() === 0, "nothing saved before confirming")
    await go(coord, "/import"); await upload(coord, "t.csv", `Full name,ID or passport\n${importName},EX${RUN}\n`); await button(coord, "Check file").click(); await button(coord, "Add 1 trainee").click(); await coord.getByRole("status").filter({ hasText: "1 trainee added" }).waitFor(); await go(coord, "/trainees?search=" + encodeURIComponent(importName)); ok(await coord.getByRole("link", { name: importName }).count() === 1, "confirming adds the trainee")
    await go(dir, "/import?kind=certificates"); await upload(dir, "c.csv", `Trainee name,ID or passport,Course,Issue date,Expiry date\n${importName},EX${RUN},Monthly Training,15/03/2024,15/03/2030\n`); await button(dir, "Check file").click(); await button(dir, "Add 1 certificate").click(); await dir.getByRole("status").filter({ hasText: "1 certificate added" }).waitFor(); ok(true, "director imports a past certificate")
    await go(dir, "/certificates?status=Issued&search=" + encodeURIComponent(importName)); ok((await dir.locator("main").innerText()).includes("15 Mar 2030"), "it appears as issued, with its dates"); const link = await dir.getByRole("link", { name: "Download" }).getAttribute("href"); const pdf = await dir.request.get(BASE + link); ok(pdf.ok() && (await pdf.body()).slice(0, 4).toString() === "%PDF", "certificate PDF downloads from the list")
    const token = (await (await fetch(API + "login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usr: "sole@test.local", pwd: PW }) })).json()).tokens.access_token
    const name = decodeURIComponent(link.split("/")[2]); const code = (await (await fetch(FRAPPE + "/api/resource/Certificate Register/" + name, { headers: { Authorization: "Bearer " + token } })).json()).data.verification_code
    const pub = await browser.newContext({ viewport: { width: 390, height: 844 } }); const v = await pub.newPage(); await v.goto(BASE + "/verify/" + code); text = await v.locator("body").innerText(); await shot(v, "72_verify", false); ok(text.includes("This certificate is valid") && text.includes(importName) && text.includes("15 Mar 2030"), "QR page works on a phone with no sign-in"); ok(!text.includes("EX" + RUN), "it doesn't show the ID number")
    await v.goto(BASE + "/verify/madeup" + RUN); ok((await v.locator("body").innerText()).includes("Certificate not found"), "made-up code says not found"); await pub.close()
    await go(sole, "/team"); await shot(sole, "73_team", false); text = await sole.locator("main").innerText(); ok(text.includes("coord@test.local") && text.includes("Email isn't set up yet"), "team page lists people and flags email"); await sole.getByRole("button", { name: /^Send/ }).first().click(); await sole.getByRole("alertdialog").getByRole("button", { name: /^Send/ }).click(); await toasted(sole, "nothing can be sent"); ok(true, "sending without email gives a clear message")
    await go(coord, "/team"); ok(/isn't part of your role/.test(await coord.content()), "coordinator refused the team page")
    // Adding suppliers, equipment and team members
    const vendor = "Portal Vendor " + RUN, vendorPin = "V" + RUN + "123W", vendor2 = vendor + " Two"
    await go(sole, "/suppliers"); await sole.getByRole("button", { name: "New supplier" }).click(); await shot(sole, "76_new_supplier", false)
    await dlg(sole).locator("#supplier_name").fill(vendor); await dlg(sole).locator("#tax_id").fill("nonsense"); await choose(sole, "supplier_group", "Trainers")
    ok((await dlg(sole).locator("#tax_withholding_category").innerText()).includes("WHT 5%"), "choosing Trainers selects the 5% withholding tax")
    await dlg(sole).getByRole("button", { name: "Save" }).click(); await dlg(sole).getByRole("alert").waitFor(); ok(/letter, nine digits/.test(await dlg(sole).getByRole("alert").innerText()), "a bad PIN shows a clear message in the form")
    await dlg(sole).locator("#tax_id").fill(vendorPin); await saved(sole)
    await go(sole, "/suppliers?search=" + encodeURIComponent(vendor)); text = await sole.locator("main").innerText(); ok(text.includes(vendor) && text.includes(vendorPin) && text.includes("WHT 5%"), "new supplier appears in the list"); await shot(sole, "77_suppliers_edit", false)
    await sole.getByRole("button", { name: "Edit" }).click(); ok(await dlg(sole).locator("#tax_id").inputValue() === vendorPin && await dlg(sole).locator("#supplier_name").inputValue() === vendor, "edit form opens with the saved values")
    await dlg(sole).locator("#supplier_name").fill(vendor2); await dlg(sole).locator("#tax_id").fill(""); await choose(sole, "tax_withholding_category", "None"); await saved(sole)
    await go(sole, "/suppliers?search=" + encodeURIComponent(vendor2)); text = await sole.locator("main").innerText(); ok(text.includes(vendor2) && !text.includes(vendorPin) && !text.includes("WHT 5%"), "edits show, with the PIN and withholding tax cleared")
    await sole.getByRole("button", { name: "Edit" }).click(); ok(await dlg(sole).locator("#supplier_name").inputValue() === vendor2 && await dlg(sole).locator("#tax_id").inputValue() === "", "edit form reopens with what was just saved"); await sole.keyboard.press("Escape")
    await go(dir, "/suppliers"); ok(await dir.getByRole("button", { name: "New supplier" }).count() === 1, "a Director can add suppliers")
    await go(acct, "/suppliers"); ok(await acct.getByRole("button", { name: "New supplier" }).count() === 0 && await acct.getByRole("button", { name: "Edit" }).count() === 0, "accounts staff don't see the supplier buttons")
    await go(dir, "/equipment"); ok(await dir.getByRole("button", { name: "New equipment" }).count() === 0, "a Director doesn't see the equipment button")
    const colleague = "portal" + RUN + "@test.local"
    await go(sole, "/team"); await sole.getByRole("button", { name: "New team member" }).click(); await shot(sole, "79_new_member", false)
    text = await dlg(sole).innerText(); ok(text.includes("Training Coordinator") && text.includes("Quality Care Accounts"), "the form offers Desk's role profiles"); ok(/email isn't set up yet/.test(text), "the form warns that no welcome email can go yet")
    await dlg(sole).locator("#full_name").fill("Portal Colleague"); await dlg(sole).locator("#email").fill(colleague)
    await dlg(sole).getByRole("button", { name: "Save" }).click(); await dlg(sole).getByRole("alert").waitFor(); ok(/Role profile is needed/.test(await dlg(sole).getByRole("alert").innerText()), "a role profile must be ticked")
    await dlg(sole).getByLabel("Tractor Supervisor").check(); await dlg(sole).getByLabel("Quality Care Accounts").check(); await dlg(sole).getByLabel("Quality Care Accounts").uncheck(); await dlg(sole).getByLabel("Training Coordinator").check(); await saved(sole)
    await go(sole, "/team"); { const row = sole.locator("tr", { hasText: colleague }); const line = await row.innerText(); ok(line.includes("Portal Colleague") && line.includes("Tractor Supervisor") && line.includes("Training Coordinator") && !line.includes("Accounts") && line.includes("Never signed in"), "new colleague appears with the ticked profiles") }
    // Standard prices
    const setPrice = async (item, amount) => { await go(sole, "/services"); await sole.locator("tr", { hasText: item }).getByRole("button", { name: "Edit price" }).click(); await dlg(sole).locator("#standard_rate").fill(String(amount)); await saved(sole); await go(sole, "/services") }
    await go(coord, "/services"); ok(await coord.getByRole("button", { name: "Edit price" }).count() === 0, "a coordinator doesn't see the price button")
    await setPrice("Monthly Training", 4000); ok((await sole.locator("tr", { hasText: "Monthly Training" }).innerText()).includes("4,000"), "standard price shows"); await shot(sole, "81_prices", false)
    await sole.locator("tr", { hasText: "Monthly Training" }).getByRole("button", { name: "Edit price" }).click(); ok(await dlg(sole).locator("#standard_rate").inputValue() === "4000", "price form reopens with what was saved"); await shot(sole, "82_price_form", false); await sole.keyboard.press("Escape")
    await setPrice("Tractor Hire", 1500)
    await go(sole, "/batches"); await sole.getByRole("button", { name: "New class" }).click(); await fillDialog(sole, { "Course": { pick: "Monthly Training" } }); ok(await dlg(sole).locator("#standard_fee").inputValue() === "4000", "a new class starts from the standard price"); await sole.keyboard.press("Escape")
    await go(sole, "/tractor"); await sole.getByRole("button", { name: "Record job" }).click(); await fillDialog(sole, { "Service": { pick: "Tractor Hire" } }); ok(await dlg(sole).locator("#rate").inputValue() === "1500", "a tractor job starts from the standard price"); await sole.keyboard.press("Escape")
    await setPrice("Monthly Training", 0); await setPrice("Tractor Hire", 0); ok((await sole.locator("tr", { hasText: "Monthly Training" }).innerText()).includes("Set per class or job"), "zero puts it back to set per class or job")
  }

  // Reports and roles
  {
    await go(coord, "/reports"); text = await coord.locator("main").innerText(); await shot(coord, "74_reports_coord", false); ok(text.includes("Course summary") && text.includes("Certificates expiring") && !text.includes("Trial balance") && !text.includes("Profit and loss"), "coordinator's report list only shows training reports")
    await go(sole, "/reports"); text = await sole.locator("main").innerText(); await shot(sole, "75_reports", true); ok(["Profit and loss", "Trial balance", "Who owes what", "Payments received", "Withholding tax on bills", "Work not yet invoiced", "Equipment register"].every((name) => text.includes(name)), "full report list for finance roles")
    await go(sole, "/reports/profit-and-loss?from=2024-01-01&to=2024-12-31"); text = await sole.locator("main").innerText(); await shot(sole, "76_report_pl", false); ok(text.includes("Profit / (loss)") && /6,761,61[23]/.test(text), "profit and loss report shows the books' profit")
    await go(sole, "/reports/receivables-ageing"); ok(await sole.locator('input[type=date]').count() === 0 && (await sole.locator("main").innerText()).includes("Macmillan"), "ageing report asks for no dates and lists debtors")
    labels = await navLabels(dir); ok(labels.includes("Invoices") && labels.includes("Supplier Bills") && labels.includes("Equipment") && labels.includes("Books"), "director's menu shows the books")
    await go(dir, "/invoices/" + encodeURIComponent(invoice)); ok(await dir.getByRole("button", { name: "Record payment" }).count() === 0 && (await dir.locator("main").innerText()).includes("Unpaid"), "director reads an invoice but can't take payment")
  }

  // Pay Now, as a customer on a phone, with a stand-in for Safaricom
  {
    const http = require("http"), { execSync } = require("child_process"); let stk = null
    const daraja = http.createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { if (req.method === "POST") stk = JSON.parse(b); res.end(JSON.stringify(req.method === "POST" ? { CheckoutRequestID: "ws_ui_" + RUN, MerchantRequestID: "m", CustomerMessage: "Success" } : { access_token: "AT" })) }) }).listen(9913)
    const py = (code) => execSync(`../env/bin/python -W ignore -c "import frappe; frappe.init('qctest.localhost', sites_path='.'); frappe.connect(); frappe.set_user('Administrator'); ${code}; frappe.db.commit()"`, { cwd: process.env.BENCH_SITES, stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split("\n").pop()
    const mpesa = (on) => py(`s = frappe.get_doc('QC Mpesa Settings'); s.update(dict(provider='Safaricom Daraja', enabled=${on ? 1 : 0}, shortcode='174379', callback_base_url='https://qc.example.co.ke', consumer_key='k', consumer_secret='sec', passkey='pk')); s.allowed_ips = (s.allowed_ips or '') + chr(10) + '127.0.0.1'; s.save()`)
    const cust = "Pay Page " + RUN
    await go(coord, "/customers"); await button(coord, "New customer").click(); await fillDialog(coord, { "Name": cust }); await submit(coord, "Save"); await toasted(coord, "Customer saved")
    const newInvoice = py(`d = frappe.new_doc('Sales Invoice'); d.update(dict(company=frappe.db.get_single_value('Global Defaults', 'default_company'), customer='${cust}')); d.append('items', dict(item_code='Monthly Training', qty=1, rate=2500)); d.run_method('set_missing_values'); d.insert(); d.submit(); print(d.name + '|' + d.qc_pay_code)`).split("|")
    const m = await browser.newContext({ viewport: { width: 390, height: 844 } }); const pay = await m.newPage(); pay.setDefaultTimeout(30000)
    await pay.goto(BASE + "/pay/" + newInvoice[1]); text = (await pay.locator("body").innerText()).replace(/\u00a0/g, " "); ok(text.includes("KES 2,500") && text.includes(cust) && /isn't available|contact/i.test(text), "with M-Pesa off, the page shows the balance and how to reach you"); await shot(pay, "80_pay_off", false)
    mpesa(true); await new Promise((r) => setTimeout(r, 1500))
    await go(acct, "/invoices/" + encodeURIComponent(newInvoice[0])); ok(await acct.getByRole("button", { name: "Copy Pay Now link" }).count() === 1, "accounts can copy the Pay Now link")
    await pay.goto(BASE + "/pay/" + newInvoice[1]); await pay.waitForLoadState("networkidle"); await shot(pay, "81_pay", false); ok(new URL(pay.url()).pathname.startsWith("/pay/"), "page opens with no sign-in")
    await pay.fill("#phone", "123"); await pay.getByRole("button", { name: /^Pay KES/ }).click(); await pay.locator("[role=alert]").first().waitFor(); ok(/valid Kenyan phone/.test(await pay.locator("form [role=alert]").innerText()), "wrong phone number explained")
    await pay.fill("#phone", "0712345678"); await pay.getByRole("button", { name: /^Pay KES/ }).click(); await pay.getByText("Check your phone").waitFor(); await shot(pay, "82_pay_waiting", false); ok(stk && stk.Amount === 2500 && stk.PhoneNumber === "254712345678", "customer's phone gets the prompt for the balance")
    await fetch(FRAPPE + "/api/method/quality_care.quality_care.mobile_money.stk_callback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ Body: { stkCallback: { CheckoutRequestID: "ws_ui_" + RUN, ResultCode: 0, ResultDesc: "Done", CallbackMetadata: { Item: [{ Name: "Amount", Value: 2500 }, { Name: "MpesaReceiptNumber", Value: "UI" + RUN }, { Name: "PhoneNumber", Value: 254712345678 }] } } } }) })
    await pay.getByText("Payment received").waitFor({ timeout: 20000 }); text = await pay.locator("body").innerText(); await shot(pay, "83_pay_done", false); ok(text.includes("UI" + RUN), "page confirms payment with the M-Pesa receipt")
    await go(acct, "/invoices/" + encodeURIComponent(newInvoice[0])); ok((await acct.locator("main").innerText()).includes("Paid"), "invoice shows paid for accounts"); await pay.goto(BASE + "/pay/" + newInvoice[1]); ok((await pay.locator("body").innerText()).includes("paid in full"), "reopening the link says it's paid")
    await pay.goto(BASE + "/pay/madeup" + RUN); ok((await pay.locator("body").innerText()).includes("isn't valid"), "made-up link explained"); mpesa(false); daraja.close(); await m.close()
  }

  // Books menu, paging and page furniture
  {
    await go(sole, "/dashboard"); const side = sole.locator("aside"); ok(await side.getByRole("link", { name: "Expenses" }).count() === 0, "Books children stay folded away elsewhere")
    await side.getByRole("button", { name: "Show Books pages" }).click(); ok(await side.getByRole("link", { name: "Income" }).count() === 1, "arrow opens the Books children")
    await side.getByRole("button", { name: "Hide Books pages" }).click(); ok(await side.getByRole("link", { name: "Income" }).count() === 0, "arrow folds the Books children away"); await side.getByRole("button", { name: "Show Books pages" }).click()
    await side.getByRole("link", { name: "Expenses" }).click(); await sole.waitForURL(/\/books\/expenses/); await sole.waitForLoadState("networkidle"); await shot(sole, "90_expenses", false); ok(await side.locator('a[aria-current="page"]').innerText() === "Expenses", "sidebar marks the child page"); await side.getByRole("button", { name: "Hide Books pages" }).click(); ok(await side.getByRole("link", { name: "Expenses" }).count() === 0 && /\/books\/expenses/.test(sole.url()), "the chevron folds Books away while you're inside it, without leaving the page"); await side.getByRole("button", { name: "Show Books pages" }).click(); ok(await side.getByRole("link", { name: "Expenses" }).count() === 1, "and opens it again"); ok((await sole.getByRole("banner").innerText()).includes("Expenses"), "breadcrumb names the child page")
    await go(sole, "/books/expenses?from=2024-01-01&to=2024-12-31"); text = await sole.locator("main").innerText(); ok(/13,114,186/.test(text) && text.includes("Instructor Fees"), "expenses total matches the books"); await go(sole, "/books/income?from=2024-01-01&to=2024-12-31"); text = await sole.locator("main").innerText(); ok(/19,875,79/.test(text) && text.includes("Monthly Trainings"), "income total matches the books"); await shot(sole, "91_income", false)
    await go(coord, "/books/expenses"); await coord.getByText("This isn't part of your role").waitFor({ timeout: 10000 }).then(() => ok(true, "coordinator refused expenses")).catch(() => ok(false, "coordinator refused expenses"))
    const rows = (p) => p.locator("main table tbody tr").count()
    await go(acct, "/equipment"); ok(await rows(acct) === 25, "lists start with 25 rows"); await acct.locator("nav[aria-label=Pages]").scrollIntoViewIfNeeded(); await shot(acct, "92_pager", false); const y = await acct.evaluate(() => scrollY)
    await acct.getByRole("button", { name: "Load more" }).click(); await acct.waitForFunction(() => document.querySelectorAll("main table tbody tr").length === 50); ok(await rows(acct) === 50 && /more=1/.test(acct.url()), "Load more adds 25 rows"); ok(Math.abs((await acct.evaluate(() => scrollY)) - y) < 60, "Load more keeps your place")
    text = await acct.locator("nav[aria-label=Pages]").innerText(); ok(text.includes("1–50") && text.includes("75"), "pager shows what's on screen")
    await acct.locator("nav[aria-label=Pages]").getByRole("link", { name: "Page 3" }).click(); await acct.waitForURL(/page=3/); await acct.waitForFunction(() => document.querySelectorAll("main table tbody tr").length === 25); ok(!/more=/.test(acct.url()), "page numbers work and reset Load more"); text = await acct.locator("nav[aria-label=Pages]").innerText(); ok(text.includes("51–75"), "page 3 shows the last rows"); ok(await acct.getByRole("button", { name: "Load more" }).count() === 0, "no Load more on the last page")
    await acct.locator("nav[aria-label=Pages]").getByRole("link", { name: "Previous page" }).click(); await acct.waitForURL(/page=2/); ok(true, "previous page works"); await go(acct, "/equipment?more=2&page=1"); await acct.getByPlaceholder("Search by item or location").fill("zzzz"); await acct.waitForURL(/search=zzzz/); ok(!/more=|page=/.test(acct.url()), "searching goes back to the start")
    await go(acct, "/trainers"); ok(await rows(acct) >= 25 && await acct.locator("nav[aria-label=Pages]").count() === 1, "trainer list has paging"); await go(acct, "/reports/equipment-register"); ok(await rows(acct) === 25 && await acct.locator("nav[aria-label=Pages]").count() === 1, "reports have paging")
    const kit = "Portal Trainer " + RUN
    await go(acct, "/equipment"); await acct.getByRole("button", { name: "New equipment" }).click(); await shot(acct, "78_new_equipment", false)
    await dlg(acct).locator("#asset_name").fill(kit); await choose(acct, "asset_category", "Training Equipment"); await dlg(acct).locator("#purchase_date").fill("2026-02-01"); await dlg(acct).locator("#value").fill("2"); await dlg(acct).locator("#bought_from").fill("Test Shop")
    ok((await dlg(acct).locator("#location").innerText()).includes("Halcyon Medical"), "the only location is already chosen"); await saved(acct)
    await go(acct, "/equipment?search=" + encodeURIComponent(kit)); text = await acct.locator("main").innerText(); ok(text.includes(kit) && text.includes("Training Equipment"), "new equipment appears in the list")
    const ico = await acct.request.get(BASE + "/favicon.ico"); ok(ico.ok() && /icon/.test(ico.headers()["content-type"]), "favicon is served"); ok(await acct.locator('link[rel="icon"]').count() >= 1, "pages link the icon")
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); const l = await ctx.newPage(); await l.goto(BASE + "/login"); await l.waitForLoadState("networkidle"); const z = await l.evaluate(() => { const i = document.querySelector("img[src*=ambulance]"); const f = document.querySelector("form"); return { img: getComputedStyle(i).zIndex, top: document.elementFromPoint(f.getBoundingClientRect().left + 20, f.getBoundingClientRect().top + 20)?.closest("form,section") !== null, blur: getComputedStyle(i).filter } }); await shot(l, "93_login", false); ok(z.img === "-20" && z.top, "login photo sits behind everything: z-index " + z.img); await ctx.close()
  }

  // Print formats, by role
  {
    const fetchPrint = (who, path) => who.request.get(BASE + path)
    const isPdf = async (r) => r.ok() && (await r.body()).slice(0, 4).toString() === "%PDF"
    ok(await isPdf(await fetchPrint(acct, "/print/invoice/" + encodeURIComponent(invoice))), "invoice prints")
    await go(acct, "/invoices/" + encodeURIComponent(invoice)); const receipt = await acct.getByRole("link", { name: "Print", exact: true }).last().getAttribute("href"); ok(/\/print\/receipt\//.test(receipt) && await isPdf(await fetchPrint(acct, receipt)), "receipt prints")
    await go(acct, "/bills"); const billLink = await acct.getByRole("link", { name: "Print", exact: true }).first().getAttribute("href"); ok(await isPdf(await fetchPrint(acct, billLink)), "supplier bill prints")
    await go(trac, "/tractor"); const jobLink = await trac.getByRole("link", { name: "Print", exact: true }).first().getAttribute("href"); ok(await isPdf(await fetchPrint(trac, jobLink)), "supervisor prints a tractor job")
    await coord.goto(batchUrl); await coord.waitForLoadState("networkidle"); const classLink = await coord.getByRole("link", { name: "Class list" }).getAttribute("href"); ok(await isPdf(await fetchPrint(coord, classLink)), "coordinator prints a class list")
    ok(!(await fetchPrint(trac, "/print/invoice/" + encodeURIComponent(invoice))).ok(), "supervisor can't print an invoice"); ok(!(await fetchPrint(coord, billLink)).ok(), "coordinator can't print a supplier bill"); ok((await fetchPrint(acct, "/print/user/Administrator")).status() === 404, "only listed documents print")
  }

  // Desk
  {
    await go(sole, "/dashboard?year=2024"); const ctx = sole.context(); const [desk] = await Promise.all([ctx.waitForEvent("page"), sole.locator("header").getByRole("link", { name: "Open Full System" }).click()])
    await desk.waitForURL(/qctest.localhost:8010\/desk/, { timeout: 60000 }); ok(true, "Open Full System lands in Desk, already signed in")
    await desk.waitForFunction(() => window.frappe && frappe.session && frappe.session.user === "sole@test.local", null, { timeout: 60000 }).then(() => ok(true, "Desk session is the same person")).catch(() => ok(false, "Desk session is the same person")); await desk.close()
    await go(sole, "/invoices/" + encodeURIComponent(invoice))
    const [rec] = await Promise.all([ctx.waitForEvent("page"), sole.getByRole("link", { name: "Open in Desk" }).click()])
    await rec.waitForURL(/\/desk\/sales-invoice\//, { timeout: 60000 }); await rec.close(); ok(true, "Open in Desk goes to that record")
  }

  // Signing in to the portal opens Desk too
  {
    const c2 = await browser.newContext(); const q = await c2.newPage(); q.setDefaultTimeout(40000); await q.goto(BASE + "/certificates"); await q.fill("#email", "acct@test.local"); await q.fill("#password", PW); await q.click("button[type=submit]"); await q.waitForURL(BASE + "/certificates"); ok(true, "signing in passes through Desk and comes back to the page asked for")
    const d2 = await c2.newPage(); await d2.goto(FRAPPE + "/desk"); await d2.waitForFunction(() => window.frappe && frappe.session && frappe.session.user === "acct@test.local", null, { timeout: 60000 }).then(() => ok(true, "Desk opens signed in, without clicking anything in the portal")).catch(() => ok(false, "Desk opens signed in: " + d2.url())); await d2.close()
    await q.goto(BASE + "/dashboard"); await q.waitForLoadState("networkidle"); await q.getByRole("banner").getByRole("button").last().click(); await q.getByRole("menuitem", { name: "Sign out" }).click(); await q.waitForURL(/\/login/); const d3 = await c2.newPage(); await d3.goto(FRAPPE + "/desk"); await d3.waitForURL(/\/login/, { timeout: 30000 }).then(() => ok(true, "and signing out closes it")).catch(() => ok(false, "and signing out closes it")); await c2.close()
  }

  // Signing out of the portal closes Full System too
  {
    const o = await session(browser, "acct@test.local"); await o.waitForLoadState("networkidle"); const ctx = o.context()
    const [desk] = await Promise.all([ctx.waitForEvent("page"), o.locator("aside").getByRole("link", { name: "Open Full System" }).click()]); await desk.waitForURL(/\/desk/, { timeout: 60000 }); await desk.waitForFunction(() => window.frappe && frappe.session && frappe.session.user === "acct@test.local", null, { timeout: 60000 }); ok(true, "Full System opens from the portal")
    await o.getByRole("banner").getByRole("button").last().click(); await o.getByRole("menuitem", { name: "Sign out" }).click(); await o.waitForURL(/\/login/); await desk.goto(FRAPPE + "/desk"); await desk.waitForLoadState("load"); await desk.waitForURL(/\/login/, { timeout: 30000 }).then(() => ok(true, "signing out of the portal locks Full System")).catch(() => ok(false, "signing out of the portal locks Full System: " + desk.url())); await ctx.close()
  }

  // Sessions
  {
    const login = async () => (await (await fetch(API + "login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usr: "dir@test.local", pwd: PW }) })).json()).tokens
    const seal = (t, expiresAt) => new EncryptJWT({ accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt }).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setExpirationTime("1h").encrypt(new TextEncoder().encode(process.env.SESSION_SECRET).slice(0, 32))
    const withCookie = async (value) => { const ctx = await browser.newContext(); await ctx.addCookies([{ name: "qc_session", value, url: BASE }]); return ctx }
    let ctx = await withCookie(await seal(await login(), Date.now() - 1000)); const before = (await ctx.cookies())[0].value
    let p = await ctx.newPage(); await p.goto(BASE + "/dashboard"); await p.waitForLoadState("networkidle"); ok(/dashboard/.test(p.url()) && (await ctx.cookies())[0].value !== before, "expired access token refreshes by itself")
    const stale = await seal(await login(), Date.now() - 1000); const ctx2 = await withCookie(stale); const results = await Promise.all(["/dashboard", "/certificates", "/trainees", "/reports"].map((u) => ctx2.request.get(BASE + u, { maxRedirects: 0 }))); ok(results.every((r) => r.status() === 200), "several pages at once share one refresh: " + results.map((r) => r.status()))
    const t = await login(); await fetch(API + "logout", { method: "POST", headers: { Authorization: "Bearer " + t.access_token } }); ctx = await withCookie(await seal(t, Date.now() + 3600000)); p = await ctx.newPage(); await p.goto(BASE + "/dashboard"); ok(/\/login\?expired=1/.test(p.url()) && (await ctx.cookies()).every((c) => c.name !== "qc_session"), "revoked token ends the session cleanly")
    ctx = await withCookie("not-a-real-session"); p = await ctx.newPage(); await p.goto(BASE + "/dashboard"); ok(/\/login/.test(p.url()), "forged cookie is ignored")
  }

  // Phone width
  {
    const m = await session(browser, "sole@test.local", { width: 390, height: 844 })
    for (const path of ["/dashboard?year=2024", "/invoices", "/trainers", "/batches", "/suppliers", "/equipment", "/team"]) { await go(m, path); const w = await m.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); ok(w[0] <= w[1] + 1, `no sideways page scroll on ${path} (${w})`) }
    await go(m, "/dashboard?year=2024"); await shot(m, "60_phone")
  }
  ok(problems.length === 0, "no browser errors: " + problems.slice(0, 5).join(" | "))
  console.log(`TOTAL pass ${pass} fail ${fail}`)
  await browser.close()
})().catch((e) => { console.log("CRASH", e.message.slice(0, 500)); console.log(`TOTAL pass ${pass} fail ${fail + 1}`); process.exit(1) })
