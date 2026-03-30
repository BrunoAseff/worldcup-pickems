export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(138,224,178,0.22),transparent_38%),linear-gradient(180deg,#f7fff9_0%,#effaf2_100%)] px-6 py-16">
      <section className="flex w-full max-w-4xl flex-col gap-8 rounded-[2rem] border border-white/70 bg-white/90 px-8 py-10 shadow-[0_24px_80px_rgba(34,84,52,0.10)] backdrop-blur sm:px-12">
        <div className="flex flex-col gap-3">
          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Setup inicial pronto
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-emerald-950 sm:text-5xl">
            Base do bolão configurada para começar a implementação.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-emerald-900/70 sm:text-lg">
            Next 16, Tailwind 4, shadcn/ui, Drizzle, Postgres local em Docker e
            fluxo com pnpm já estão integrados.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="https://ui.shadcn.com/docs/installation"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            shadcn/ui
          </a>
          <a
            href="https://orm.drizzle.team/docs/overview"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-200 bg-white px-4 text-sm font-medium text-emerald-900 transition-colors hover:bg-emerald-50"
          >
            Drizzle ORM
          </a>
        </div>
      </section>
    </main>
  );
}
