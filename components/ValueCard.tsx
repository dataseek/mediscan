"use client";

import { useLanguage } from "@/components/LanguageProvider";
import type { MedicalValue } from "@/lib/types";

const estadoStyles: Record<MedicalValue["estado"], { dot: string; text: string; card: string; labelPath: string }> = {
  normal: {
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    card: "border-emerald-400/20 bg-emerald-400/5",
    labelPath: "result.status.normal"
  },
  atencion: {
    dot: "bg-amber-300",
    text: "text-amber-200",
    card: "border-amber-300/25 bg-amber-300/8",
    labelPath: "result.status.attention"
  },
  revisar: {
    dot: "bg-red-400",
    text: "text-red-200",
    card: "border-red-400/35 bg-red-500/10",
    labelPath: "result.status.review"
  }
};

export function ValueCard({ value }: { value: MedicalValue }) {
  const { t } = useLanguage();
  const styles = estadoStyles[value.estado];

  return (
    <article className={`rounded-xl border p-4 ${styles.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-base font-semibold text-white">{value.nombre}</h4>
          <p className="mt-1 break-words text-sm text-slate-300">{value.valor}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${styles.text}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
          {t(styles.labelPath)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-200">{value.explicacion}</p>
    </article>
  );
}
