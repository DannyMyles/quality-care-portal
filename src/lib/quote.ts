export interface DailyQuote {
  quote: string
  author: string
  source: "api" | "fallback"
}

// One topic per request, as the quote service only returns quotes matching every topic it's given.
const CATEGORIES = ["education", "success", "leadership", "wisdom"]

const FALLBACK_QUOTES: Omit<DailyQuote, "source">[] = [
  { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { quote: "Let us never consider ourselves finished nurses. We must be learning all of our lives.", author: "Florence Nightingale" },
  { quote: "Wherever the art of medicine is loved, there is also a love of humanity.", author: "Hippocrates" },
  { quote: "Nurses dispense comfort, compassion and caring without even a prescription.", author: "Val Saintsbury" },
]

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function fallback(): DailyQuote {
  return { ...pick(FALLBACK_QUOTES), source: "fallback" }
}

/** Server only, so the API key never reaches the browser. Kept for 30 minutes, and a failure never stops the dashboard. */
export async function getRandomQuote(): Promise<DailyQuote> {
  const apiKey = process.env.RANDOM_QUOTE_API_KEY
  const baseUrl = process.env.RANDOM_QUOTE_API_URL
  if (!apiKey || !baseUrl) return fallback()
  try {
    const response = await fetch(`${baseUrl}?categories=${pick(CATEGORIES)}`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 1800 },
    })
    if (!response.ok) return fallback()
    const data = (await response.json()) as { quote?: string; author?: string }[]
    const first = data[0]
    if (!first?.quote) return fallback()
    return { quote: first.quote.trim(), author: (first.author ?? "Unknown").replace(/\s+/g, " ").trim(), source: "api" }
  } catch {
    return fallback()
  }
}
