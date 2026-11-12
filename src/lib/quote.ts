export interface DailyQuote {
  quote: string
  author: string
  source: "api" | "fallback"
}

// One topic per request, as the quote service only returns quotes matching every topic it's given.
// Education suits the training company; the others suit any business.
const CATEGORIES = ["education", "success", "leadership", "wisdom"]
const BUSINESS_CATEGORIES = ["success", "leadership", "wisdom"]

const FALLBACK_QUOTES: Omit<DailyQuote, "source">[] = [
  { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { quote: "Let us never consider ourselves finished nurses. We must be learning all of our lives.", author: "Florence Nightingale" },
  { quote: "Wherever the art of medicine is loved, there is also a love of humanity.", author: "Hippocrates" },
  { quote: "Nurses dispense comfort, compassion and caring without even a prescription.", author: "Val Saintsbury" },
]

// For a company that doesn't train: running a farm, property and a business.
const BUSINESS_QUOTES: Omit<DailyQuote, "source">[] = [
  { quote: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
  { quote: "The farmer has to be an optimist or he wouldn't still be a farmer.", author: "Will Rogers" },
  { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Proverb" },
  { quote: "Don't judge each day by the harvest you reap but by the seeds that you plant.", author: "Robert Louis Stevenson" },
]

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function fallback(training: boolean): DailyQuote {
  return { ...pick(training ? FALLBACK_QUOTES : BUSINESS_QUOTES), source: "fallback" }
}

/** Server only, so the API key never reaches the browser. Kept for 30 minutes, and a failure never stops the dashboard.
 * Nursing and teaching quotes only show to the company that trains. */
export async function getRandomQuote(training = true): Promise<DailyQuote> {
  const apiKey = process.env.RANDOM_QUOTE_API_KEY
  const baseUrl = process.env.RANDOM_QUOTE_API_URL
  if (!apiKey || !baseUrl) return fallback(training)
  try {
    const response = await fetch(`${baseUrl}?categories=${pick(training ? CATEGORIES : BUSINESS_CATEGORIES)}`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 1800 },
    })
    if (!response.ok) return fallback(training)
    const data = (await response.json()) as { quote?: string; author?: string }[]
    const first = data[0]
    if (!first?.quote) return fallback(training)
    return { quote: first.quote.trim(), author: (first.author ?? "Unknown").replace(/\s+/g, " ").trim(), source: "api" }
  } catch {
    return fallback(training)
  }
}
