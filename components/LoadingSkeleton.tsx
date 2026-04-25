export function LoadingSkeleton() {
  return (
    <section className="min-w-0 max-w-full space-y-3.5" aria-label="Analizando estudio">
      <div className="rounded-2xl border border-white/[0.06] bg-panel p-4">
        <div className="h-3 w-24 animate-softPulse rounded-full bg-white/[0.1]" />
        <div className="mt-3 h-4 w-40 animate-softPulse rounded-full bg-white/[0.08]" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full animate-softPulse rounded-full bg-white/[0.06]" />
          <div className="h-3 w-[92%] animate-softPulse rounded-full bg-white/[0.06]" />
          <div className="h-3 w-[78%] animate-softPulse rounded-full bg-white/[0.06]" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-panel p-4">
        <div className="h-4 w-36 animate-softPulse rounded-full bg-white/[0.08]" />
        <div className="mt-4 space-y-2.5">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-xl border border-white/[0.05] bg-ink/40 p-3">
              <div className="flex justify-between gap-3">
                <div className="h-3 w-28 animate-softPulse rounded-full bg-white/[0.08]" />
                <div className="h-3 w-16 animate-softPulse rounded-full bg-medical/20" />
              </div>
              <div className="mt-3 h-3 w-full animate-softPulse rounded-full bg-white/[0.05]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
