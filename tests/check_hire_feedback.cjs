// Equipment hire, class feedback and importing a class list, in the browser.
// Needs the test site on 8010 and this portal on 3101 pointed at it.
//   node tests/check_hire_feedback.cjs
const { chromium } = require("playwright")
const fs = require("fs")
const os = require("os")
const path = require("path")

const BASE = process.env.BASE ?? "http://localhost:3101", FRAPPE = "http://qctest.localhost:8010", PW = "Test@12345qc", SHOTS = process.env.SHOTS
const QC = "Quality Care Trainers Holdings Company"
const RUN = String(Date.now()).slice(-6)
const PHONE = { width: 390, height: 844 }
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m) }
const problems = []

let cookie = ""
async function admin(method, url, body) {
  const r = await fetch(FRAPPE + url, { method, headers: { Cookie: cookie, "Content-Type": "application/json", Accept: "application/json" }, body: body ? JSON.stringify(body) : undefined })
  return r.json().catch(() => ({}))
}
const list = async (doctype, filters, fields = ["name"], extra = {}) =>
  (await admin("GET", `/api/method/frappe.client.get_list?${new URLSearchParams({ doctype, filters: JSON.stringify(filters), fields: JSON.stringify(fields), limit_page_length: "500", ...extra })}`)).message ?? []

function watch(page, who) {
  page.setDefaultTimeout(30000)
  page.on("pageerror", (e) => problems.push(who + " " + page.url() + " " + e.message.slice(0, 160)))
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|403|417|Failed to load resource/.test(m.text())) problems.push(who + " console " + m.text().slice(0, 160)) })
}
async function session(browser, email, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage(); watch(page, email)
  await page.goto(BASE + "/login"); await page.fill("#email", email); await page.fill("#password", PW); await page.click("button[type=submit]")
  await page.waitForURL(/\/dashboard/); await page.waitForLoadState("networkidle"); return page
}
const shot = (p, n) => SHOTS ? p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }) : null
const go = async (p, to) => { await p.goto(BASE + to); await p.waitForLoadState("networkidle") }
// Money is written with a non-breaking space after KES.
const main = async (p) => (await p.locator("main").innerText()).replace(/\u00a0/g, " ")
const until = (p, text) => p.locator("main").getByText(text).first().waitFor({ timeout: 30000 }).then(() => true, () => false)
const menu = async (p) => (await p.locator("aside nav a").allInnerTexts()).map((x) => x.trim()).filter(Boolean)
const toast = (p, text) => p.locator("[data-sonner-toast]", { hasText: text }).first().waitFor({ timeout: 60000 }).then(() => true, () => false)
const fits = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
async function pick(dialog, input, text, option) {
  await input.click(); await input.fill(text)
  const choice = dialog.locator("[role=option]", { hasText: option ?? text }).first()
  await choice.waitFor(); await choice.locator("button").click()
}

// Hires hold equipment and deposits, so earlier runs' are undone: journals cancelled, invoices removed.
async function clearHires() {
  for (const row of await list("Equipment Hire Record", {}, ["name", "sales_invoice", "damage_invoice", "deposit_journal", "settlement_journal"])) {
    for (const journal of [row.settlement_journal, row.deposit_journal]) if (journal) await admin("POST", "/api/method/frappe.client.cancel", { doctype: "Journal Entry", name: journal })
    for (const invoice of [row.sales_invoice, row.damage_invoice]) if (invoice) await admin("DELETE", `/api/resource/Sales Invoice/${encodeURIComponent(invoice)}`)
    await admin("DELETE", `/api/resource/Equipment Hire Record/${encodeURIComponent(row.name)}`)
  }
}

;(async () => {
  const login = await fetch(FRAPPE + "/api/method/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "usr=Administrator&pwd=admin" })
  cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
  // A clean start: no earlier hires holding equipment, and known rates
  await clearHires()
  await admin("PUT", "/api/resource/Item/Adult Manikin", { qc_hire_rate_day: 1000, qc_hire_rate_week: 5000 })
  await admin("PUT", "/api/resource/Item/Manual Defibrillator", { qc_hire_rate_day: 2000, qc_hire_rate_week: 0 })
  const customer = (await list("Customer", {}, ["name"], { limit_page_length: "1" }))[0].name
  const people = []
  for (const [full_name, phone] of [[`Grace Feedback ${RUN}`, "0722000111"], [`Hassan Feedback ${RUN}`, "0733000222"]]) {
    people.push((await admin("POST", "/api/resource/Trainee", { full_name, phone })).data.name)
  }
  const past = new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10)
  const batch = (await admin("POST", "/api/resource/Training Batch", { course: "BLS", status: "Completed", start_date: past, end_date: past, venue: `Browser Hospital ${RUN}`, standard_fee: 25000, trainees: people.map((trainee) => ({ trainee, fee: 25000 })) })).data
  const browser = await chromium.launch()

  // Coordinator records a hire
  const coord = await session(browser, "coord@test.local")
  ok((await menu(coord)).includes("Equipment Hire"), "the coordinator's menu has Equipment Hire")
  await go(coord, "/hires")
  ok((await main(coord)).includes("Equipment Hire"), "the hire list opens")
  await coord.getByRole("button", { name: "Record hire" }).first().click()
  let dialog = coord.getByRole("dialog")
  await pick(dialog, dialog.locator("#customer"), customer)
  await pick(dialog, dialog.locator("[id^=asset-]").first(), "Adult Manikin", "Adult Manikin")
  ok((await dialog.innerText()).replace(/\u00a0/g, " ").includes("KES 1,000"), "the set daily rate shows against the manikin")
  await dialog.getByRole("button", { name: "Add another item" }).click()
  await pick(dialog, dialog.locator("[id^=asset-]").nth(1), "Defib", "Manual Defibrillator")
  await dialog.locator("#periods").fill("3")
  await dialog.locator("[id^=condition-]").nth(1).selectOption("Fair")
  ok((await dialog.innerText()).includes("9,000"), "the total updates: 3 days of 1,000 plus 2,000")
  await shot(coord, "hire-form")
  await dialog.getByRole("button", { name: "Save" }).click()
  await coord.waitForURL(/\/hires\/EHR-/); await coord.waitForLoadState("networkidle")
  const first = decodeURIComponent(coord.url().split("/hires/")[1])
  let text = await main(coord)
  ok(text.includes("Adult Manikin") && text.includes("Manual Defibrillator") && text.includes("Set rates") && text.includes("9,000"), "the hire opens with its equipment, set rates and total")
  ok(text.includes("Fair"), "each item's condition when hired shows")
  ok(await coord.getByRole("button", { name: "Create invoice" }).count() === 1, "a coordinator, who drafts invoices, is offered Create invoice for a hire at the set rates")
  await shot(coord, "hire-detail")

  // Return, late
  await coord.getByRole("button", { name: "Record return" }).click()
  dialog = coord.getByRole("dialog")
  const later = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10)
  await dialog.locator("#return_date").fill(later)
  ok((await dialog.innerText()).includes("after the due date"), "a return after the due date is pointed out")
  await dialog.getByRole("button", { name: "Save return" }).click()
  ok((await dialog.innerText()).includes("Choose the condition"), "each item's condition on return is needed")
  for (const select of await dialog.locator("select[id^=in-]").all()) await select.selectOption("Good")
  await dialog.locator("select[id^=in-]").first().selectOption("Damaged")
  await dialog.locator("#return_notes").fill("Cracked chest plate")
  await dialog.getByRole("button", { name: "Save return" }).click()
  ok(await toast(coord, "Return recorded"), "the return is saved")
  await until(coord, "2 days late")
  text = await main(coord)
  ok(text.includes("Returned") && text.includes("2 days late") && text.includes("Damaged") && text.includes("Cracked chest plate"), "the hire shows returned two days late, with the damage noted")

  // A negotiated rate
  await go(coord, "/hires")
  await coord.getByRole("button", { name: "Record hire" }).first().click()
  dialog = coord.getByRole("dialog")
  await pick(dialog, dialog.locator("#customer"), customer)
  await pick(dialog, dialog.locator("[id^=asset-]").first(), "Adult Manikin", "Adult Manikin")
  await dialog.locator("#hire_basis").selectOption("Weeks")
  await dialog.getByLabel("Negotiated rate").check()
  await dialog.locator("[id^=rate-]").first().fill("4000")
  await dialog.getByRole("button", { name: "Save" }).click()
  ok((await dialog.innerText()).includes("Say why the rate was changed"), "a negotiated rate asks why")
  await dialog.locator("#negotiation_reason").fill("Long-standing customer")
  await dialog.getByRole("button", { name: "Save" }).click()
  await coord.waitForURL(/\/hires\/EHR-/); await coord.waitForLoadState("networkidle")
  const second = decodeURIComponent(coord.url().split("/hires/")[1])
  ok(!(await coord.getByRole("button", { name: "Create invoice" }).count()), "a hire waiting for approval isn't offered Create invoice")
  text = await main(coord)
  ok(text.includes("Needs approval") && text.includes("Set rate KES 5,000") && text.includes("4,000"), "it waits for approval, showing the agreed rate beside the set one")
  ok(!(await coord.getByRole("button", { name: "Approve rate" }).count()), "the coordinator can't approve it")
  await go(coord, "/hires?status=Needs+approval")
  ok((await main(coord)).includes(second), "it's listed under Needs approval")

  // Director approves; accounts invoice
  const director = await session(browser, "dir@test.local")
  await go(director, `/hires/${encodeURIComponent(second)}`)
  await director.getByRole("button", { name: "Approve rate" }).click()
  await director.getByRole("alertdialog").getByRole("button").last().click()
  ok(await toast(director, "Negotiated rate approved"), "the Director approves the rate")
  await until(director, "approved by")
  ok((await main(director)).includes("approved by dir@test.local"), "and the hire says who approved it")
  const accounts = await session(browser, "acct@test.local")
  await go(accounts, `/hires/${encodeURIComponent(second)}`)
  await accounts.getByRole("button", { name: "Create invoice" }).click()
  ok(await toast(accounts, "Draft invoice created"), "accounts staff create the invoice")
  const invoice = (await list("Sales Invoice", { equipment_hire_record: second }, ["name", "grand_total"]))[0]
  await until(accounts, invoice?.name ?? "never")
  ok(invoice && invoice.grand_total === 4000 && (await main(accounts)).includes(invoice.name), `the invoice charges the approved 4,000 and is linked from the hire (${invoice?.grand_total})`)
  ok(!(await accounts.locator("button[aria-label='Edit hire']").count()), "an invoiced hire can't be edited")

  // Equipment rates
  const manikin = (await list("Asset", { item_code: "Adult Manikin", company: QC, docstatus: 1 }, ["name"], { order_by: "name asc" }))[0].name
  await go(director, `/equipment/${encodeURIComponent(manikin)}`)
  text = await main(director)
  ok(text.includes("KES 1,000 a day") && text.includes("KES 5,000 a week") && text.includes(customer), "the equipment page shows its rates and hire history")
  await director.getByRole("button", { name: "Hire rates" }).click()
  dialog = director.getByRole("dialog")
  await dialog.locator("#day").fill("1200")
  await dialog.getByRole("button", { name: "Save" }).click()
  ok(await toast(director, "Hire rates saved"), "the Director changes the daily rate")
  await until(director, "1,200 a day")
  ok((await main(director)).includes("KES 1,200 a day"), "and the new rate shows")
  await go(director, "/hires/rates")
  text = await main(director)
  ok(text.includes("Adult Manikin") && text.includes("KES 1,200") && text.includes("Not set"), "the hire rates page lists each type with its rates, and which have none")
  await director.getByRole("button", { name: "Hire rates for Manual Defibrillator" }).click()
  dialog = director.getByRole("dialog")
  await dialog.locator("#week").fill("9000")
  await dialog.getByRole("button", { name: "Save" }).click()
  ok(await toast(director, "Hire rates saved") && (await until(director, "9,000")), "the Director sets a weekly rate from the list")
  await go(coord, "/hires/rates")
  ok(!(await coord.getByRole("button", { name: /^Hire rates for/ }).count()) && (await main(coord)).includes("Adult Manikin"), "a coordinator sees the rates but can't change them")
  await go(coord, `/equipment/${encodeURIComponent(manikin)}`)
  ok(!(await coord.getByRole("button", { name: "Hire rates" }).count()), "a coordinator can't change rates")

  // The class's feedback link
  await go(coord, `/batches/${encodeURIComponent(batch.name)}`)
  text = await main(coord)
  ok(text.includes("Student feedback") && text.includes("0 of 2 students"), "the class page has a feedback section")
  ok(await coord.locator("img[alt^='QR code']").count() === 1, "with a QR code to show the class")
  await coord.getByRole("link", { name: "Import list" }).click()
  await coord.waitForURL(/\/import\?kind=trainees&batch=/); await until(coord, "Import a class list")
  await shot(coord, "import-class")
  text = await main(coord)
  ok(text.includes("Import a class list") && text.includes(`Browser Hospital ${RUN}`) && text.includes("Billed to"), `Import list opens the import for this class, with Billed to${text.includes("Billed to") ? "" : ` (${text.slice(0, 200)})`}`)
  const code = (await admin("GET", `/api/method/frappe.client.get_value?${new URLSearchParams({ doctype: "Training Batch", filters: JSON.stringify({ name: batch.name }), fieldname: "feedback_code" })}`)).message.feedback_code

  // A student, on a phone, with no sign-in
  const student = await (await browser.newContext({ viewport: PHONE })).newPage(); watch(student, "student")
  await student.goto(`${BASE}/feedback/${code}`); await student.waitForLoadState("networkidle")
  text = await student.locator("body").innerText()
  ok(text.includes("Basic Life Support") && text.includes(`Browser Hospital ${RUN}`) && !text.includes("Grace"), "the student's page shows the class and no one's name")
  ok(await fits(student), "and fits a phone screen")
  await student.locator("#contact").fill("0799000000")
  await student.getByText("5 out of 5, Excellent").first().click({ force: true })
  await student.getByRole("button", { name: "Send feedback" }).click()
  ok(await student.getByRole("alert").filter({ hasText: "couldn't find you" }).waitFor().then(() => true, () => false), "a number not on the class is turned away")
  await student.locator("#contact").fill("+254 722 000 111")
  await student.locator("fieldset", { hasText: "The instructor" }).getByText("4 out of 5").click({ force: true })
  await student.getByText("Yes", { exact: true }).click()
  await student.locator("#improve").fill("A longer practical session")
  await shot(student, "feedback-phone")
  await student.getByRole("button", { name: "Send feedback" }).click()
  ok(await student.getByText("Thank you for your feedback").waitFor().then(() => true, () => false), "Grace's feedback is sent")
  await student.goto(`${BASE}/feedback/not-a-real-code`); await student.waitForLoadState("networkidle")
  ok((await student.locator("body").innerText()).includes("isn't valid"), "a wrong link says so")

  await go(coord, `/batches/${encodeURIComponent(batch.name)}`)
  text = await main(coord)
  ok(text.includes("1 of 2 students") && text.includes("A longer practical session") && text.includes(`Grace Feedback ${RUN}`) && text.includes("100%"), "the class page shows Grace's answers")
  await coord.getByRole("button", { name: "Add paper form" }).click()
  dialog = coord.getByRole("dialog")
  await dialog.locator("#trainee").click(); await coord.getByRole("option", { name: `Hassan Feedback ${RUN}` }).click()
  await dialog.locator("#overall").click(); await coord.getByRole("option", { name: "4: Very good" }).click()
  await dialog.locator("#improve").fill("Typed from paper")
  await dialog.getByRole("button", { name: "Save" }).click()
  ok(await toast(coord, "Feedback added"), "the coordinator types in Hassan's paper form")
  ok(await until(coord, "paper form") && (await main(coord)).includes("Typed from paper") && (await main(coord)).includes("2 of 2 students"), "it shows as a paper form, and everyone has answered")
  ok(!(await coord.getByRole("button", { name: "Add paper form" }).count()), "with no one left, Add paper form goes away")
  await coord.getByRole("button", { name: "Stop taking feedback" }).click()
  ok(await toast(coord, "Feedback closed"), "the coordinator closes feedback")
  await student.goto(`${BASE}/feedback/${code}`); await student.waitForLoadState("networkidle")
  ok((await student.locator("body").innerText()).includes("Feedback for this class is closed"), "and the student page says it's closed")

  // Phone widths for staff
  const coordPhone = await session(browser, "coord@test.local", PHONE)
  await go(coordPhone, "/hires")
  ok(await fits(coordPhone), "the hire list fits a phone")
  await go(coordPhone, `/hires/${encodeURIComponent(first)}`)
  ok(await fits(coordPhone), "a hire fits a phone")
  await go(coordPhone, `/batches/${encodeURIComponent(batch.name)}`)
  ok(await fits(coordPhone), "the class page with its feedback fits a phone")
  await go(coordPhone, "/hires")
  await coordPhone.getByRole("button", { name: "Record hire" }).first().click()
  ok(await coordPhone.getByRole("dialog").evaluate((d) => d.scrollWidth <= d.clientWidth + 1), "the hire form fits a phone")
  await shot(coordPhone, "hire-form-phone")

  // A deposit, a damaged return and the damage invoice
  const defib = (await list("Asset", { item_code: "Manual Defibrillator", company: QC, docstatus: 1 }, ["name", "asset_name"], { order_by: "name desc" }))[0]
  const third = (await admin("POST", "/api/resource/Equipment Hire Record", { company: QC, customer, hire_date: new Date().toISOString().slice(0, 10), hire_basis: "Days", periods: 1, items: [{ asset: defib.name, condition_out: "Good" }] })).data.name
  await go(accounts, `/hires/${encodeURIComponent(third)}`)
  ok((await main(accounts)).includes("No deposit taken"), "a new hire has no deposit")
  await accounts.getByRole("button", { name: "Take deposit" }).click()
  dialog = accounts.getByRole("dialog")
  await dialog.locator("#amount").fill("3000")
  await dialog.locator("#mode").click(); await accounts.getByRole("option", { name: "Cash" }).click()
  await dialog.getByRole("button", { name: "Save" }).click()
  ok(await toast(accounts, "Deposit recorded") && (await until(accounts, "held for")), "accounts staff take a 3,000 deposit")
  ok((await main(accounts)).includes("To settle it: Record the return first"), "and are told it can be settled once the equipment is back")
  await go(coord, `/hires/${encodeURIComponent(third)}`)
  ok(!(await coord.getByRole("button", { name: "Take deposit" }).count()), "a coordinator doesn't handle deposits")
  await coord.getByRole("button", { name: "Record return" }).click()
  dialog = coord.getByRole("dialog")
  await dialog.locator("select[id^=in-]").first().selectOption("Damaged")
  await dialog.locator("[id^=charge-]").first().fill("800")
  await dialog.getByRole("button", { name: "Save return" }).click()
  ok(await toast(coord, "Return recorded") && (await until(coord, "800 to invoice")), "the coordinator records the damage and an 800 charge")
  await coord.getByRole("button", { name: "Create damage invoice" }).click()
  ok(await toast(coord, "Damage invoice drafted"), "and drafts the damage invoice")
  const damage = (await list("Sales Invoice", { equipment_hire_record: third }, ["name", "grand_total"])).find((row) => row.grand_total === 800)
  ok(!!damage, "an 800 damage invoice exists for the hire")
  await go(accounts, `/hires/${encodeURIComponent(third)}`)
  ok((await main(accounts)).includes(`Submit ${damage?.name}`) || (await main(accounts)).includes("Submit "), "accounts staff are told which drafts to submit before settling")

  // Deleting a hire that isn't invoiced
  await go(coord, `/hires/${encodeURIComponent(first)}`)
  await coord.getByRole("button", { name: "Delete" }).click()
  await coord.getByRole("alertdialog").getByRole("button").last().click()
  ok(await toast(coord, "Hire deleted"), "a coordinator deletes a hire")
  await coord.waitForURL(/\/hires$/)
  ok(!(await main(coord)).includes(first), "and it's gone from the list")
  await go(accounts, `/hires/${encodeURIComponent(second)}`)
  ok(!(await accounts.getByRole("button", { name: "Delete" }).count()), "an invoiced hire, seen by accounts staff, has no Delete")

  // Feedback report, and trainers on a class
  ok((await menu(coord)).includes("Feedback"), "coordinators have the Feedback report")
  await go(coord, "/feedback-report")
  text = await main(coord)
  ok(text.includes("By course") && text.includes("By trainer") && text.includes("Basic Life Support"), "it shows ratings by course and by trainer")
  await go(coord, "/batches?search=" + encodeURIComponent(`Browser Hospital ${RUN}`))
  ok((await main(coord)).includes("/ 5"), "the class list shows the class's rating")
  await go(coord, `/batches/${encodeURIComponent(batch.name)}`)
  ok((await main(coord)).includes("Trainers and pay") && (await main(coord)).includes("No trainers recorded"), "the class page has a Trainers and pay section")
  await coord.getByRole("button", { name: "Add trainer" }).click()
  dialog = coord.getByRole("dialog")
  await dialog.locator("#supplier").click()
  const choice = dialog.locator("[role=option]").first(); await choice.waitFor(); await choice.locator("button").click()
  await dialog.locator("#fee").fill("8000")
  await dialog.getByRole("button", { name: "Save" }).click()
  ok(await toast(coord, "Trainer added") && (await until(coord, "Not billed")), "the coordinator adds a trainer at 8,000")
  ok(!(await coord.getByRole("button", { name: /Create trainer bills/ }).count()), "and isn't offered bills, which are accounts work")
  await go(accounts, `/batches/${encodeURIComponent(batch.name)}`)
  await accounts.getByRole("button", { name: "Create trainer bills (1)" }).click()
  ok(await toast(accounts, "Trainer bills drafted") && (await until(accounts, "ACC-PINV")), "accounts staff draft the trainer's bill from the class")

  // Recurring invoices: accounts staff set up a monthly charge
  ok((await menu(accounts)).includes("Recurring Invoices") && !(await menu(coord)).includes("Recurring Invoices"), "accounts staff have Recurring Invoices, coordinators don't")
  await go(accounts, "/recurring")
  await accounts.getByRole("button", { name: "New recurring charge" }).first().click()
  dialog = accounts.getByRole("dialog")
  await pick(dialog, dialog.locator("#customer"), customer)
  await dialog.locator("#item").click(); await accounts.getByRole("option", { name: /Monthly Training/ }).click()
  await dialog.locator("#description").fill(`Monthly lecture hall ${RUN}`)
  await dialog.locator("#amount").fill("12000")
  await dialog.locator("#day_of_month").fill("1")
  await dialog.locator("#start_date").fill(new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 10))
  await dialog.getByRole("button", { name: "Save" }).click()
  await accounts.waitForURL(/\/recurring\/RC-/); await accounts.waitForLoadState("networkidle")
  ok((await main(accounts)).includes(`Monthly lecture hall ${RUN}`) && (await main(accounts)).includes("Every month, on day 1"), "the charge is saved and opens")
  await accounts.getByRole("button", { name: "Create due invoices" }).click()
  ok(await toast(accounts, "Due invoices drafted") && (await until(accounts, "ACC-SINV")), "the months already due are drafted and listed")
  await accounts.getByRole("button", { name: "Stop" }).click()
  await accounts.getByRole("alertdialog").getByRole("button").last().click()
  ok(await toast(accounts, "Charge stopped") && (await until(accounts, "Stopped")), "and the charge can be stopped")

  // Reminder settings: the Director's, not the coordinator's
  ok(!(await menu(coord)).includes("Reminders"), "a coordinator has no Reminders page")
  ok((await menu(director)).includes("Reminders"), "the Director has")
  await go(director, "/reminders")
  ok((await main(director)).includes("Nothing to send") || (await main(director)).includes("Going out next"), "the Reminders page opens")
  await director.getByLabel("Overdue invoices").check()
  ok(await director.locator("#invoice_every_days").isVisible(), "ticking a kind shows its timing")
  await director.getByRole("button", { name: "Save reminder settings" }).click()
  ok(await toast(director, "Reminder settings saved"), "the Director switches on overdue-invoice reminders")
  await director.waitForLoadState("networkidle")
  ok(await director.getByLabel("Overdue invoices").isChecked(), "and it stays on")
  await director.getByLabel("Overdue invoices").uncheck()
  await director.getByRole("button", { name: "Save reminder settings" }).click()
  await toast(director, "Reminder settings saved")

  ok(problems.length === 0, `no page errors (${problems.slice(0, 5).join(" | ")})`)
  await browser.close()
  // Tidy up: invoices and hires from this run, and the original rate
  await admin("PUT", "/api/resource/Item/Adult Manikin", { qc_hire_rate_day: 1000 })
  await admin("PUT", "/api/resource/Item/Manual Defibrillator", { qc_hire_rate_week: 0 })
  await clearHires()
  console.log(`\nTOTAL pass ${pass} fail ${fail}`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error("CRASH", e); process.exit(2) })
