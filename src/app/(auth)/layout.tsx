import Image from "next/image"
import { Award, GraduationCap, Tractor } from "@/components/icons"

const FEATURES = [
  { icon: GraduationCap, label: "Trainees, classes and invoices in one place" },
  { icon: Award, label: "Certificates approved and tracked" },
  { icon: Tractor, label: "Tractor hire, from job to payment" },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#14154F]">
      {/* Layers, back to front: the photo, the tint that pushes it back, then the content. */}
      <Image src="/login-ambulance.jpg" alt="" fill priority sizes="100vw" className="-z-20 scale-105 object-cover object-center blur-[3px]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#14154F]/95 via-[#14154F]/80 to-[#14154F]/65" />
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1300px] items-center gap-12 px-6 py-10 lg:grid-cols-2 lg:px-14">
        <section className="hidden text-white lg:block">
          <div className="inline-flex rounded-2xl bg-white px-5 py-4 shadow-xl">
            <Image src="/logo-full.png" alt="Quality Care" width={788} height={193} className="h-12 w-auto" priority />
          </div>
          <h1 className="mt-14 text-[52px] leading-[1.05] font-bold tracking-tight">
            Excellence in
            <br />
            <span className="text-[#5CCBF5]">affordable training.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-white/85">Your daily work and the numbers behind it, in one simple place.</p>
          <ul className="mt-10 flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-white/90">
                <span className="flex size-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                  <Icon className="size-5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </section>
        <section className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
            <Image src="/logo-full.png" alt="Quality Care" width={788} height={193} className="mb-6 h-10 w-auto lg:hidden" />
            {children}
          </div>
        </section>
      </div>
    </div>
  )
}
