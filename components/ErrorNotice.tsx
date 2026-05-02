"use client";

type ErrorNoticeTone = "danger" | "warning";

function AlertIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M10.1 4.4 2.9 17.2A2.2 2.2 0 0 0 4.8 20.5h14.4a2.2 2.2 0 0 0 1.9-3.3L13.9 4.4a2.2 2.2 0 0 0-3.8 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ErrorNotice({
  title,
  message,
  primaryAction,
  primaryLabel,
  dismissLabel,
  onDismiss,
  tone = "danger"
}: {
  title: string;
  message: string;
  primaryAction?: () => void;
  primaryLabel?: string;
  dismissLabel: string;
  onDismiss: () => void;
  tone?: ErrorNoticeTone;
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-300/25 bg-amber-400/10 text-amber-50"
      : "border-red-300/25 bg-red-500/10 text-red-50";
  const iconClass = tone === "warning" ? "bg-amber-300/15 text-amber-100" : "bg-red-300/15 text-red-100";

  return (
    <section className={`min-w-0 rounded-2xl border p-3.5 shadow-[var(--app-shadow)] ${toneClass}`} role="alert">
      <div className="flex min-w-0 gap-3">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
          <AlertIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <h2 className="break-words text-[15px] font-extrabold leading-tight text-white">{title}</h2>
            <button
              type="button"
              aria-label={dismissLabel}
              onClick={onDismiss}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/15"
            >
              <CloseIcon />
            </button>
          </div>
          <p className="mt-1.5 break-words text-[13px] font-semibold leading-relaxed text-white/78 sm:text-sm">
            {message}
          </p>
          {primaryAction && primaryLabel ? (
            <button
              type="button"
              onClick={primaryAction}
              className="mt-3 min-h-[40px] rounded-2xl bg-white px-4 text-[13px] font-extrabold text-[#111827] shadow-sm transition hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-white/15"
            >
              {primaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
