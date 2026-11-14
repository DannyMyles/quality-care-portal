// Email in the browser: sending documents, the inbox, reading, replying and filing.
// Needs the test site on 8010, this portal on 3101 pointed at it, and the stand-in mail server on 127.0.0.1:2526
// saving to MAILDIR. Nothing leaves this machine.
//   MAILDIR=/path BENCH=/home/danny/frappe-bench node tests/check_mail.cjs
const { chromium } = require("playwright")
const { execFileSync } = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")

const BASE = process.env.BASE ?? "http://localhost:3101", FRAPPE = "http://qctest.localhost:8010", PW = "Test@12345qc", SHOTS = process.env.SHOTS
const MAILDIR = process.env.MAILDIR, BENCH = process.env.BENCH ?? "/home/danny/frappe-bench"
const QC = "Quality Care Trainers Holdings Company", HL = "Highlead Solutions Limited"
const RUN = String(Date.now()).slice(-6)
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m) }
const problems = []

let cookie = ""
async function admin(method, url, body) {
  const r = await fetch(FRAPPE + url, { method, headers: { Cookie: cookie, "Content-Type": "application/json", Accept: "application/json" }, body: body ? JSON.stringify(body) : undefined })
  return r.json().catch(() => ({}))
}
const list = async (doctype, filters, extra = {}) =>
  (await admin("GET", `/api/method/frappe.client.get_list?${new URLSearchParams({ doctype, filters: JSON.stringify(filters), fields: '["name"]', limit_page_length: "100", ...extra })}`)).message ?? []
async function mailbox(name, address, company) {
  await admin("DELETE", `/api/resource/Email Account/${encodeURIComponent(name)}`)
  await admin("POST", "/api/resource/Email Account", {
    email_account_name: name, email_id: address, qc_company: company, enable_outgoing: 1, smtp_server: "127.0.0.1", smtp_port: 2526, use_tls: 0,
    no_smtp_authentication: 1, awaiting_password: 1, enable_incoming: 1, email_server: "127.0.0.1", use_imap: 1, imap_folder: [{ folder_name: "INBOX" }],
  })
}
function deliver(raw, account) {
  const file = path.join(os.tmpdir(), `qc-mail-${Date.now()}.eml`); fs.writeFileSync(file, raw)
  try {
    const out = execFileSync("bench", ["--site", "qctest.localhost", "execute", "quality_care.tests.email_inbound.deliver", "--kwargs", JSON.stringify({ path: file, account })], { cwd: BENCH }).toString()
    return out.trim().split("\n").pop().replace(/"/g, "")
  } finally { fs.unlinkSync(file) }
}
const mails = () => fs.readdirSync(MAILDIR).filter((f) => f.endsWith(".eml")).sort()
const read = (f) => fs.readFileSync(path.join(MAILDIR, f), "utf8")

async function session(browser, email, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true })
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
const toast = (p, text) => p.locator("[data-sonner-toast]", { hasText: text }).first().waitFor({ timeout: 60000 }).then(() => true, () => false)

;(async () => {
  const login = await fetch(FRAPPE + "/api/method/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "usr=Administrator&pwd=admin" })
  cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
  for (const row of await list("Email Account", {})) await admin("DELETE", `/api/resource/Email Account/${encodeURIComponent(row.name)}`)
  await mailbox("QC Mail", "qc-mail@test.local", QC)
  const invoice = (await list("Sales Invoice", { docstatus: 1, company: QC, outstanding_amount: [">", 0] }, { order_by: "creation desc" }))[0].name
  const customer = (await admin("GET", `/api/resource/Sales Invoice/${invoice}`)).data.customer
  const buyer = (await admin("GET", `/api/resource/Customer/${encodeURIComponent(customer)}`)).data.email_id

  const browser = await chromium.launch()
  const acct = await session(browser, "acct@test.local")
  const coord = await session(browser, "coord@test.local")
  ok((await menu(acct)).includes("Inbox"), "accounts see the Inbox in the menu")
  ok(!(await menu(coord)).some((x) => x.startsWith("Inbox")), "a coordinator without the Inbox User role doesn't")

  // Email an invoice
  await go(acct, `/invoices/${invoice}`)
  await acct.getByRole("button", { name: "Actions" }).click()
  await acct.getByRole("button", { name: "Email invoice" }).click()
  const dialog = acct.getByRole("dialog")
  await dialog.getByLabel("Subject").waitFor()
  ok((await dialog.getByLabel(/^To/).inputValue()) === buyer, "the email is addressed to the customer")
  ok(/From Quality Care <qc-mail@test.local>/.test(await dialog.innerText()) && (await dialog.innerText()).includes(`${invoice}.pdf is attached`), "it says who it's from and what's attached")
  ok((await dialog.getByLabel("Message").inputValue()).includes(`Please find attached invoice ${invoice}`), "the message is already written")
  await dialog.getByLabel("Message").fill(`Dear customer,\n\nYour invoice ${RUN} is attached.\n\nKind regards,\nQuality Care`)
  await shot(acct, "mail-compose")
  const before = mails().length
  await dialog.getByRole("button", { name: "Send email" }).click()
  ok(await toast(acct, `Email sent to ${buyer}`), "sending confirms who it went to")
  const sent = mails().slice(before).map(read).find((m) => m.includes(`Your invoice ${RUN} is attached`))
  ok(sent && /^From: Quality Care <qc-mail@test\.local>/m.test(sent) && sent.includes(`filename="${invoice}.pdf"`), "the stand-in mail server got it from Quality Care, with the PDF")
  await acct.waitForLoadState("networkidle")
  const emails = acct.locator("section", { has: acct.getByRole("heading", { name: "Emails" }) })
  ok((await emails.innerText()).includes(`Invoice ${invoice} from Quality Care`) && (await emails.innerText()).includes("Sent"), "the invoice lists the email as sent")

  // A refused address shows in the dialog
  await acct.getByRole("button", { name: "Actions" }).click()
  await acct.getByRole("button", { name: "Email invoice" }).click()
  await dialog.getByLabel("Subject").waitFor()
  await dialog.getByLabel(/^To/).fill(`reject${RUN}@example.com`)
  await dialog.getByRole("button", { name: "Send email" }).click()
  ok(await dialog.getByRole("alert").filter({ hasText: `refused reject${RUN}@example.com` }).waitFor().then(() => true, () => false), "a refused address is explained in the dialog")
  await acct.keyboard.press("Escape")

  // Statement and certificate buttons
  await go(acct, `/customers?search=${encodeURIComponent(customer)}`)
  await acct.locator("main").getByRole("button", { name: "Email" }).first().click()
  await dialog.getByLabel("Subject").waitFor()
  ok((await dialog.getByLabel("Subject").inputValue()).startsWith("Your statement from Quality Care"), "customers can be emailed their statement")
  await acct.keyboard.press("Escape")
  await go(acct, "/certificates?status=Issued")
  await acct.locator("main").getByRole("button", { name: "Email" }).first().click()
  await dialog.getByLabel("Subject").waitFor()
  ok((await dialog.getByLabel("Subject").inputValue()).includes("certificate") && (await dialog.innerText()).includes(".pdf is attached"), "certificates can be emailed")
  await acct.keyboard.press("Escape")

  // A reply arrives
  const messageId = (await list("Communication", { reference_name: invoice, sent_or_received: "Sent" }, { fields: '["message_id"]', order_by: "creation desc" }))[0].message_id
  const reply = deliver(
    `From: Buyer <${buyer}>\r\nTo: qc-mail@test.local\r\nSubject: Re: Invoice ${invoice}\r\nMessage-ID: <reply${RUN}@example.com>\r\nIn-Reply-To: <${messageId}>\r\nDate: ${new Date().toUTCString()}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>Paying on Friday ${RUN}.</p><script>parent.document.title="hacked"</script><img src="https://tracker.example.com/p.gif">\r\n`,
    "QC Mail",
  )
  await go(acct, "/inbox")
  const badge = acct.locator('aside a[href="/inbox"] [aria-label$="unread"]')
  ok(await badge.isVisible() && Number(await badge.innerText()) >= 1, "the menu shows unread mail")
  const row = acct.locator("tr", { hasText: `Re: Invoice ${invoice}` }).first()
  ok((await row.innerText()).includes(`Invoice ${invoice}`) && (await row.locator('[aria-label="Unread"]').count()) === 1, "the reply is in the inbox, unread and filed under the invoice")
  await shot(acct, "mail-inbox")
  const tracker = []
  acct.on("request", (r) => { if (r.url().includes("tracker.example.com")) tracker.push(r.url()) })
  await go(acct, `/inbox/${reply}`)
  const frame = acct.frameLocator('iframe[title="Email message"]')
  ok((await frame.locator("body").innerText()).includes(`Paying on Friday ${RUN}`), "the message shows")
  await acct.waitForTimeout(1500)
  ok((await acct.title()) !== "hacked", "its scripts don't run")
  ok(!tracker.length && (await frame.locator("body").innerText()).includes("[image not loaded]"), `its tracking image isn't fetched${tracker.length ? " (" + tracker[0] + ")" : ""}`)
  ok((await main(acct)).includes(`Invoice ${invoice}`) && (await acct.getByRole("link", { name: `Invoice ${invoice}`, exact: true }).getAttribute("href")) === `/invoices/${invoice}`, "it links to the invoice it's about")
  await shot(acct, "mail-message")
  await acct.getByRole("button", { name: "Reply" }).click()
  await dialog.getByLabel("Message").fill(`Thank you ${RUN}.`)
  const beforeReply = mails().length
  await dialog.getByRole("button", { name: "Send reply" }).click()
  ok(await toast(acct, "Reply sent"), "a reply can be sent")
  const answer = mails().slice(beforeReply).map(read).find((m) => m.includes(`Thank you ${RUN}`))
  ok(answer && answer.includes(`In-Reply-To: <reply${RUN}@example.com>`) && answer.includes(`Subject: Re: Invoice ${invoice}`), "it threads onto their message")
  ok(await acct.locator("main").getByText("Replied", { exact: true }).first().waitFor({ timeout: 30000 }).then(() => true, () => false), "the message shows as replied")

  // A new email with an attachment, filed under a supplier
  const supplier = (await list("Supplier", {}))[0].name
  const seller = (await admin("GET", `/api/resource/Supplier/${encodeURIComponent(supplier)}`)).data.email_id || `supplier${RUN}@example.com`
  const fresh = deliver(
    `From: Seller <${seller}>\r\nTo: qc-mail@test.local\r\nSubject: Bill ${RUN}\r\nMessage-ID: <bill${RUN}@example.com>\r\nDate: ${new Date().toUTCString()}\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="b${RUN}"\r\n\r\n--b${RUN}\r\nContent-Type: text/plain\r\n\r\nOur bill.\r\n--b${RUN}\r\nContent-Type: text/plain; name="bill${RUN}.txt"\r\nContent-Disposition: attachment; filename="bill${RUN}.txt"\r\n\r\nAmount 1500\r\n--b${RUN}--\r\n`,
    "QC Mail",
  )
  await go(acct, `/inbox/${fresh}`)
  const download = acct.getByRole("link", { name: new RegExp(`bill${RUN}\\.txt`) })
  const [file] = await Promise.all([acct.waitForEvent("download"), download.click()])
  ok(fs.readFileSync(await file.path(), "utf8").includes("Amount 1500") && file.suggestedFilename() === `bill${RUN}.txt`, "its attachment downloads")
  await acct.getByRole("button", { name: /File under/ }).click()
  await dialog.locator("#doctype").click()
  await acct.getByRole("option", { name: "Supplier", exact: true }).click()
  await dialog.locator("#supplier").fill(supplier.slice(0, 4))
  await acct.getByRole("option", { name: new RegExp(supplier) }).first().click()
  await dialog.getByRole("button", { name: "File it" }).click()
  ok(await toast(acct, "Email filed"), "it can be filed under a supplier")
  await acct.waitForLoadState("networkidle")
  ok((await acct.getByRole("link", { name: `Supplier ${supplier}`, exact: true }).getAttribute("href")) === `/suppliers/${encodeURIComponent(supplier)}`, "and links there")
  await go(acct, `/suppliers/${encodeURIComponent(supplier)}`)
  ok((await main(acct)).includes(`Bill ${RUN}`), "the supplier's page shows it")
  await go(acct, `/inbox/${fresh}`)
  await acct.getByRole("button", { name: "Close" }).click()
  ok(await toast(acct, "Closed"), "it can be closed")
  await go(acct, "/inbox?tab=closed")
  ok((await main(acct)).includes(`Bill ${RUN}`), "and appears under Closed")

  // Who can't
  await go(coord, `/inbox/${fresh}`)
  ok(/isn't part of your role|couldn't|not permitted/i.test(await main(coord)) || !(await main(coord)).includes(`Bill ${RUN}`), "a coordinator can't open an unfiled supplier email")
  await go(coord, `/inbox/${reply}`)
  ok((await main(coord)).includes(`Re: Invoice ${invoice}`), "but can read replies about invoices they can see")

  // Highlead has no mailbox
  await acct.context().addCookies([{ name: "qc_company", value: encodeURIComponent(HL), url: BASE }])
  await go(acct, "/inbox")
  ok((await main(acct)).includes("Highlead Solutions has no mailbox yet"), "Highlead's inbox explains it has no mailbox yet")
  ok(!(await main(acct)).includes(`Re: Invoice ${invoice}`), "and shows none of Quality Care's mail")
  await acct.context().addCookies([{ name: "qc_company", value: encodeURIComponent(QC), url: BASE }])

  // Phone width
  const phone = await session(browser, "acct@test.local", { width: 390, height: 844 })
  for (const to of ["/inbox", `/inbox/${reply}`]) {
    await go(phone, to)
    ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${to} fits a phone screen`)
  }
  await shot(phone, "mail-phone")

  ok(!problems.length, `no page errors${problems.length ? ": " + problems.slice(0, 5).join(" | ") : ""}`)
  await browser.close()
  for (const row of await list("Email Account", {})) await admin("DELETE", `/api/resource/Email Account/${encodeURIComponent(row.name)}`)
  console.log(`\n${pass}/${pass + fail} passed`)
  process.exit(fail ? 1 : 0)
})().catch(async (e) => { console.error(e); for (const row of await list("Email Account", {})) await admin("DELETE", `/api/resource/Email Account/${encodeURIComponent(row.name)}`); process.exit(1) })
