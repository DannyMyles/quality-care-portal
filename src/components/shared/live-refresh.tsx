"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

const EVERY = 2 * 60 * 1000
const AT_LEAST = 60 * 1000

/** Keeps figures current: reloads the page's data every two minutes, and on returning to the tab. What's being typed is kept. */
export function LiveRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  const last = useRef(0)

  useEffect(() => {
    last.current = Date.now()
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - last.current < AT_LEAST) return
      last.current = Date.now()
      router.refresh()
    }
    const timer = setInterval(refresh, EVERY)
    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [router, pathname])

  return null
}
