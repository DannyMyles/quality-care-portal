// Switching company, page by page: what each company shows, what it must never show, and where a switch lands.
// Runs against the test site after check_portal.cjs (it needs the test users and Highlead's data).
const { chromium } = require("playwright")
const { execSync } = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")

const BASE = process.env.BASE ?? "http://localhost:3101", FRAPPE = "http://qctest.localhost:8010", PW = "Test@12345qc", SHOTS = process.env.SHOTS
const QC = "Quality Care Trainers Holdings Company", HL = "Highlead Solutions Limited"
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m) }
const problems = []

async function session(browser, email, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage(); page.setDefaultTimeout(30000)
  page.on("pageerror", (e) => problems.push(email + " " + e.message.slice(0, 160)))
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|403|Failed to load resource/.test(m.text())) problems.push(email + " console " + m.text().slice(0, 160)) })
  await page.goto(BASE + "/login"); await page.fill("#email", email); await page.fill("#password", PW); await page.click("button[type=submit]")
  await page.waitForURL(/\/dashboard/); await page.waitForLoadState("networkidle"); return page
}
const shot = (p, n) => SHOTS ? p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }) : null
const go = async (p, to) => { await p.goto(BASE + to); await p.waitForLoadState("networkidle") }
const main = (p) => p.locator("main").innerText()
const menu = async (p) => (await p.locator("aside nav a").allInnerTexts()).map((x) => x.trim()).filter(Boolean)
const crumb = (p) => p.locator("header nav[aria-label=Breadcrumb] > span").last().innerText()
const switcher = (p) => p.getByRole("button", { name: /Change company/ })
async function switchTo(p, company) {
  await switcher(p).click(); await p.getByRole("menuitem", { name: company }).click()
  await p.getByRole("button", { name: new RegExp(`Company: ${company}`) }).waitFor({ timeout: 60000 })
  await p.waitForLoadState("networkidle")
}
const broken = (text) => /couldn't load|something went wrong|isn't part of your role|Application error/i.test(text)
async function pdfText(page, url) {
  const r = await page.request.get(BASE + url)
  const body = await r.body()
  if (!r.ok() || body.slice(0, 4).toString() !== "%PDF") return null
  const file = path.join(os.tmpdir(), `qc-switch-${Date.now()}.pdf`); fs.writeFileSync(file, body)
  try { return execSync(`pdftotext -layout ${file} -`).toString() } finally { fs.unlinkSync(file) }
}

const COMMON = ["/dashboard", "/invoices", "/customers", "/bills", "/suppliers", "/books", "/books/journals", "/books/income", "/books/expenses", "/services", "/equipment", "/reports", "/team"]
const QC_ONLY = ["/trainees", "/batches", "/certificates", "/trainers", "/import", "/payments"]
const HL_ONLY = ["/tractor"]
const QC_MENU = ["Trainees", "Classes", "Certificates", "M-Pesa", "Courses & Services", "Trainers & WHT", "Import from Excel"]
const HL_MENU = ["Tractor Hire", "Services"]
// What each company's pages show, and the other company must never show.
const MARKERS = {
  "/equipment": { [HL]: "Nardi Plough" },
  "/services": { [QC]: "Basic Life Support", [HL]: "Residential Rent" },
  "/books/journals": { [HL]: "Tractor log" },
  "/books/income": { [HL]: "Tractor Ploughing" },
  "/books": { [HL]: "Tractor Operator Cash" },
  "/reports": { [QC]: "Course summary", [HL]: "Tractor profit by month" },
  "/dashboard": { [QC]: "Classes", [HL]: "Highlead Solutions depends most" },
}

;(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true })
  const sole = await session(browser, "sole@test.local")

  // Every page, in each company
  for (const [company, mine, theirs, wanted, unwanted] of [[QC, QC_ONLY, HL_ONLY, QC_MENU, HL_MENU], [HL, HL_ONLY, QC_ONLY, HL_MENU, QC_MENU]]) {
    const short = company === QC ? "Quality Care" : "Highlead"
    const other = company === QC ? "Highlead" : "Quality Care"
    await go(sole, "/dashboard")
    if (!(await switcher(sole).innerText()).includes(short)) await switchTo(sole, company)
    const items = await menu(sole)
    ok(wanted.every((x) => items.includes(x)) && !unwanted.some((x) => items.includes(x)), `${short}'s menu: ${items.join(", ")}`)
    const logo = company === QC ? await sole.locator("aside img[alt='Quality Care']").count() : await sole.locator(`aside [aria-label='${HL}']`).count()
    ok(logo === 1, `${short}'s name heads the sidebar`)
    for (const page of [...COMMON, ...mine]) {
      await go(sole, page)
      const text = await main(sole)
      ok(!broken(text), `${short} ${page} opens`)
      ok(!text.includes(other), `${short} ${page} never mentions ${other}`)
      const marks = MARKERS[page] ?? {}
      if (marks[company]) ok(text.includes(marks[company]), `${short} ${page} shows its own records (${marks[company]})`)
      const theirMark = marks[company === QC ? HL : QC]
      if (theirMark) ok(!text.includes(theirMark), `${short} ${page} leaves out the other company's (${theirMark})`)
      await shot(sole, `sw_${short.replace(" ", "")}${page.replaceAll("/", "_")}`)
    }
    await go(sole, "/equipment?search=Defibrillator"); { const t = await main(sole); ok(company === QC ? t.includes("Manual Defibrillator") : !t.includes("Manual Defibrillator"), `${short} equipment search finds only its own (defibrillators are Quality Care's)`) }
    await go(sole, "/services"); ok((await crumb(sole)) === (company === QC ? "Courses & Services" : "Services"), `${short} names the services page right`)
    // A page that belongs to the other company opens empty rather than showing its records.
    for (const page of theirs) { await go(sole, page); const text = await main(sole); ok(!/Tractor Cash Customer|ACLS|BLS|Florence/.test(text) && text.includes(`belong to ${other}`), `${short} ${page} typed in directly says it belongs to ${other}`) }
  }

  // Where a switch lands, from every page
  for (const [from, to, pages] of [[HL, QC, [...COMMON, ...HL_ONLY]], [QC, HL, [...COMMON, ...QC_ONLY]]]) {
    for (const page of pages) {
      await go(sole, page)
      if (!(await switcher(sole).innerText()).includes(from === QC ? "Quality Care" : "Highlead")) { await switchTo(sole, from); await go(sole, page) }
      await switchTo(sole, to)
      const expected = COMMON.includes(page) ? page : "/dashboard"
      const landed = new URL(sole.url()).pathname
      ok(landed === expected && !broken(await main(sole)), `switching on ${page} lands on ${expected} (got ${landed})`)
    }
  }
  // From a single record you go back to that list in the other company.
  await go(sole, "/dashboard"); if (!(await switcher(sole).innerText()).includes("Quality Care")) await switchTo(sole, QC)
  await go(sole, "/invoices"); await sole.locator("main table tbody a[href^='/invoices/']").first().click(); await sole.waitForURL(/\/invoices\/.+/); await sole.waitForLoadState("networkidle")
  await switchTo(sole, HL); ok(new URL(sole.url()).pathname === "/invoices", "switching on an invoice goes back to the invoice list")
  await go(sole, "/books/journals"); await sole.locator("main table tbody a").first().click(); await sole.waitForURL(/\/books\/journals\/.+/); await sole.waitForLoadState("networkidle")
  await switchTo(sole, QC); ok(new URL(sole.url()).pathname === "/books/journals", "switching on a journal goes back to the journal list")

  // The choice is remembered
  await switchTo(sole, HL); await sole.reload(); await sole.waitForLoadState("networkidle")
  ok((await switcher(sole).innerText()).includes("Highlead"), "a reload keeps the company")
  await go(sole, "/dashboard"); ok((await main(sole)).includes("How Highlead Solutions is doing") && !(await main(sole)).includes("Classes"), "Highlead's dashboard is its own")
  await shot(sole, "sw_highlead_dashboard")

  // Prints carry the company of the record, or the one being worked in
  {
    await go(sole, "/books/journals"); const hlJournal = await sole.locator("main table tbody a[href^='/books/journals/']").first().innerText()
    const j = await pdfText(sole, "/print/journal/" + encodeURIComponent(hlJournal.trim().split("\n")[0]))
    ok(j && j.includes("Highlead") && !j.includes("Quality Care"), "a Highlead journal prints as Highlead")
    const tb = await pdfText(sole, "/print/report/trial-balance?from=2026-01-01&to=2026-12-31")
    ok(tb && tb.includes("Highlead") && tb.includes("Tractor Operator Cash") && !/ - (HSL|QC)\b/.test(tb), "Highlead's trial balance prints as Highlead, without account suffixes")
    const st = await pdfText(sole, "/print/statement/customer/" + encodeURIComponent("Tractor Cash Customer"))
    ok(st && st.includes("Highlead") && !st.includes("Quality Care"), "a statement printed in Highlead is Highlead's")
    await switchTo(sole, QC)
    const qtb = await pdfText(sole, "/print/report/trial-balance?from=2024-01-01&to=2026-12-31")
    ok(qtb && qtb.includes("Quality Care") && !qtb.includes("Tractor Operator Cash"), "Quality Care's trial balance stays its own")
  }

  // Each role, in each company
  {
    const trac = await session(browser, "trac@test.local")
    ok((await switcher(trac).innerText()).includes("Highlead"), "the tractor supervisor opens in Highlead")
    ok((await menu(trac)).includes("Tractor Hire"), "and sees the tractor")
    await go(trac, "/tractor"); ok((await main(trac)).includes("Tractor Cash Customer"), "with Highlead's jobs")
    await switchTo(trac, QC); ok(!(await menu(trac)).includes("Tractor Hire") && !broken(await main(trac)), "in Quality Care the supervisor has no tractor, and nothing breaks")

    const coord = await session(browser, "coord@test.local")
    ok((await switcher(coord).innerText()).includes("Quality Care") && (await menu(coord)).includes("Classes"), "the coordinator opens in Quality Care with classes")
    await go(coord, "/batches"); await switchTo(coord, HL)
    ok(new URL(coord.url()).pathname === "/dashboard" && !(await menu(coord)).includes("Classes") && !broken(await main(coord)), "switching the coordinator to Highlead drops training and lands safely")

    const acct = await session(browser, "acct@test.local")
    await switchTo(acct, HL)
    ok(!(await menu(acct)).includes("M-Pesa"), "M-Pesa is Quality Care's till, so Highlead has no M-Pesa page")
    for (const page of ["/invoices", "/bills", "/books", "/reports"]) { await go(acct, page); ok(!broken(await main(acct)), `accounts can work Highlead's ${page}`) }
    await switchTo(acct, QC); ok((await menu(acct)).includes("M-Pesa"), "and M-Pesa comes back in Quality Care")
  }

  // Someone limited to one company in the full system
  {
    const admin = (await browser.newContext()).request
    await admin.post(FRAPPE + "/api/method/login", { form: { usr: "Administrator", pwd: "admin" } })
    const made = await admin.post(FRAPPE + "/api/resource/User Permission", { data: { user: "coord@test.local", allow: "Company", for_value: QC, apply_to_all_doctypes: 1 } })
    const limit = (await made.json()).data?.name
    ok(!!limit, "a coordinator can be limited to Quality Care in the full system")
    const coord = await session(browser, "coord@test.local")
    await coord.context().addCookies([{ name: "qc_company", value: HL, url: BASE }]); await coord.reload(); await coord.waitForLoadState("networkidle")
    ok(await switcher(coord).count() === 0 && (await coord.getByRole("banner").innerText()).includes("Quality Care"), "they get no switcher, and a forged choice of Highlead is ignored")
    await go(coord, "/equipment"); ok(!(await main(coord)).includes("Nardi Plough"), "and Highlead's records stay out of reach")
    await admin.delete(FRAPPE + "/api/resource/User Permission/" + encodeURIComponent(limit))
  }

  // Phone width
  {
    const m = await session(browser, "sole@test.local", { width: 390, height: 844 })
    await switchTo(m, HL); ok((await switcher(m).innerText()).includes("Highlead"), "the switcher works at phone width")
    const w = await m.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); ok(w[0] <= w[1] + 1, "no sideways scroll with the switcher at phone width")
    await shot(m, "sw_phone"); await switchTo(m, QC)
  }

  ok(problems.length === 0, "no browser errors: " + problems.slice(0, 5).join(" | "))
  console.log(`TOTAL pass ${pass} fail ${fail}`)
  await browser.close()
})().catch((e) => { console.log("CRASH", e.message.slice(0, 500)); console.log(`TOTAL pass ${pass} fail ${fail + 1}`); process.exit(1) })
