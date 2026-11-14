"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Shows a received email's HTML in a sealed frame: no scripts run, nothing loads from outside (so tracking
 * images can't report that it was opened), and links open in a new tab. The frame grows to fit the message.
 */
export function MessageFrame({ html }: { html: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(240)
  const doc = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">
<base target="_blank">
<style>body{margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#1F2033;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:#2E3094}blockquote{margin:12px 0;padding-left:12px;border-left:3px solid #E3E5F1;color:#6A6C8C}table{max-width:100%}</style>
</head><body>${html || "<p><em>No message text.</em></p>"}</body></html>`

  useEffect(() => {
    const element = frame.current
    if (!element) return
    const fit = () => {
      const body = element.contentDocument?.body
      if (body) setHeight(Math.min(Math.max(body.scrollHeight + 8, 120), 4000))
    }
    element.addEventListener("load", fit)
    fit()
    return () => element.removeEventListener("load", fit)
  }, [html])

  return (
    <iframe
      ref={frame}
      title="Email message"
      srcDoc={doc}
      // Same origin only so the page can measure the message's height. Scripts stay off.
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      className="w-full rounded-xl border border-[#E3E5F1] bg-white p-4"
      style={{ height }}
    />
  )
}
