import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string; reset?: string }> }) {
  const { next, expired, reset } = await searchParams
  return <LoginForm next={next} expired={!!expired} reset={!!reset} />
}
