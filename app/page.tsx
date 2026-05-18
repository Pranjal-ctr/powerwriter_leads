import Link from "next/link";

const features = [
  {
    icon: "⚡",
    title: "Mandatory Assignment",
    description:
      "Every lead is guaranteed to be routed to a mandatory provider first — ensuring priority partners always receive their leads.",
    accent: "from-indigo-500 to-indigo-700",
    glow: "shadow-indigo-500/20",
  },
  {
    icon: "🔄",
    title: "Fair Round-Robin",
    description:
      "Remaining slots are filled from a fair pool using a cursor-based round-robin, preventing any single provider from monopolising volume.",
    accent: "from-blue-500 to-blue-700",
    glow: "shadow-blue-500/20",
  },
  {
    icon: "📊",
    title: "Monthly Quota Control",
    description:
      "Each provider has a monthly quota. Exhausted providers are automatically skipped and reinstated when a subscription_paid webhook fires.",
    accent: "from-violet-500 to-violet-700",
    glow: "shadow-violet-500/20",
  },
];

const services = [
  {
    name: "Service 1",
    mandatory: ["Provider 1"],
    fairPool: ["Provider 2", "Provider 3", "Provider 4"],
  },
  {
    name: "Service 2",
    mandatory: ["Provider 5"],
    fairPool: ["Provider 6", "Provider 7", "Provider 8"],
  },
  {
    name: "Service 3",
    mandatory: ["Provider 1", "Provider 4"],
    fairPool: ["Provider 2", "Provider 3", "Provider 5", "Provider 6", "Provider 7", "Provider 8"],
  },
];

const stats = [
  { label: "Services", value: "3" },
  { label: "Providers", value: "8" },
  { label: "Assignments / Lead", value: "3" },
  { label: "Allocation Model", value: "Round-Robin" },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-36 text-center">
        {/* Animated gradient blobs */}
        <div
          aria-hidden
          className="animate-gradient pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-950 via-zinc-950 to-blue-950"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-56 -top-56 h-[600px] w-[600px] rounded-full bg-indigo-600/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-56 -right-56 h-[600px] w-[600px] rounded-full bg-blue-600/15 blur-3xl"
        />

        <div className="relative z-10 flex max-w-4xl flex-col items-center gap-6">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
            Production-grade Lead Distribution
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up animate-fade-up-delay-1 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Smart Leads.{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              Fair Distribution.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="animate-fade-up animate-fade-up-delay-2 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Automatically route inbound leads across 8 providers using mandatory
            priority assignments and cursor-based round-robin — with per-provider
            monthly quotas, idempotent webhooks, and a real-time dashboard.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up animate-fade-up-delay-3 flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/request-service"
              id="hero-cta-submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/50 hover:-translate-y-0.5"
            >
              Submit a Lead →
            </Link>
            <Link
              href="/dashboard"
              id="hero-cta-dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-7 py-3.5 text-sm font-semibold text-zinc-200 backdrop-blur transition-all hover:bg-zinc-700/60 hover:-translate-y-0.5"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it Works ─────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-indigo-400">
            Allocation Engine
          </p>
          <h2 className="text-3xl font-bold text-white">How every lead is distributed</h2>
          <p className="mt-3 text-zinc-400">
            Three deterministic rules govern every allocation decision
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className={`group rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl ${f.glow} transition-all hover:-translate-y-1 hover:border-zinc-700`}
            >
              <div
                className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-2xl shadow-lg`}
              >
                {f.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{f.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Services Grid ────────────────────────────────────────── */}
      <section className="border-y border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <div className="mb-14 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-blue-400">
              Configuration
            </p>
            <h2 className="text-3xl font-bold text-white">Available Services</h2>
            <p className="mt-3 text-zinc-400">
              Each service has a dedicated provider pool with its own rules
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {services.map((svc) => (
              <div
                key={svc.name}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-zinc-700"
              >
                <h3 className="mb-5 font-semibold text-white text-lg">{svc.name}</h3>

                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                      Mandatory
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {svc.mandatory.map((p) => (
                        <span
                          key={p}
                          className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                      Fair Pool
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {svc.fairPool.map((p) => (
                        <span
                          key={p}
                          className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-300"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ───────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-violet-400">
            Under the Hood
          </p>
          <h2 className="text-3xl font-bold text-white">Built for correctness</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              tech: "Next.js 16",
              detail: "App Router + Route Handlers",
              icon: "▲",
              color: "text-white",
            },
            {
              tech: "PostgreSQL",
              detail: "Row-level locking, FOR UPDATE",
              icon: "🐘",
              color: "text-blue-300",
            },
            {
              tech: "Prisma ORM",
              detail: "Type-safe queries + migrations",
              icon: "◆",
              color: "text-indigo-300",
            },
            {
              tech: "Server-Sent Events",
              detail: "Real-time dashboard updates",
              icon: "📡",
              color: "text-green-300",
            },
          ].map((item) => (
            <div
              key={item.tech}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <p className={`text-2xl mb-3 ${item.color}`}>{item.icon}</p>
              <p className="font-semibold text-white">{item.tech}</p>
              <p className="mt-1 text-xs text-zinc-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="border-t border-zinc-800 bg-gradient-to-b from-zinc-900/0 to-zinc-900/60">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to test the system?</h2>
          <p className="mt-4 text-zinc-400">
            Submit a real lead or fire a concurrent batch using the built-in test tools.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/request-service"
              className="rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:-translate-y-0.5"
            >
              Submit a Lead
            </Link>
            <Link
              href="/test-tools"
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-7 py-3.5 text-sm font-semibold text-zinc-200 transition-all hover:bg-zinc-700/50 hover:-translate-y-0.5"
            >
              Open Test Tools
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-zinc-500 sm:flex-row">
          <p>PowerWriter Leads — Lead Distribution System</p>
          <div className="flex gap-6">
            <Link href="/dashboard" className="transition-colors hover:text-zinc-300">Dashboard</Link>
            <Link href="/request-service" className="transition-colors hover:text-zinc-300">Request Service</Link>
            <Link href="/test-tools" className="transition-colors hover:text-zinc-300">Test Tools</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
