import type { AnalysisResponse, MedicalValue } from "@/lib/types";
import { MediScanLogoMark } from "@/components/MediScanLogoMark";
import { splitExplanationIntoParagraphs } from "@/lib/utils";

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-white/35 min-[380px]:h-5 min-[380px]:w-5" viewBox="0 0 24 24" fill="none">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg aria-hidden="true" className="h-[26px] w-[33px] shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M7 3.8h7l3 3v13.4H7V3.8Z" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
      <path
        d="M14 3.8v3h3M9 10h5M9 13.5h6M9 17h4"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        style={{ width: 20, height: 20 }}
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none">
      <path d="M5 4v16h15" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M8.2 16V9.5M12 16V6.5M15.8 16v-4.5M19.5 16V8" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none">
      <path d="M9.4 9.2a3 3 0 0 1 5.8 1.2c0 2.8-3.2 2.6-3.2 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 19h.01" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeWidth="1.65" />
    </svg>
  );
}

function StethoscopeIcon() {
  return (
    <svg aria-hidden="true" className="h-[22px] w-[22px]" viewBox="0 0 24 24" fill="none">
      <path d="M6 4v5a4 4 0 0 0 8 0V4" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M10 13v2.8a4.2 4.2 0 0 0 8.4 0V14" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <path d="M18.4 14.2a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z" stroke="currentColor" strokeWidth="1.65" />
      <path d="M4.5 4h3M12.5 4h3" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

const resultCardArticleClass =
  "grid min-w-0 max-w-full grid-cols-[44px_minmax(0,1fr)_20px] items-start gap-x-2.5 gap-y-3 rounded-2xl border border-[rgba(13,61,50,1)] bg-panel p-3 min-[380px]:grid-cols-[48px_minmax(0,1fr)_20px] min-[380px]:gap-x-3 min-[380px]:p-3.5 sm:grid-cols-[52px_minmax(0,1fr)_22px] sm:gap-x-3.5 sm:p-4";

function ResultCard({
  icon,
  iconClassName,
  title,
  children,
  prose = false,
  className,
  animationDelayMs
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  children: React.ReactNode;
  prose?: boolean;
  className?: string;
  animationDelayMs?: number;
}) {
  return (
    <article
      className={`${resultCardArticleClass} ${className ?? ""} animate-fadeIn [will-change:transform,opacity]`}
      style={animationDelayMs ? { animationDelay: `${animationDelayMs}ms` } : undefined}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl min-[380px]:h-12 min-[380px]:w-12 sm:h-[52px] sm:w-[52px] ${iconClassName}`}
      >
        {icon}
      </div>
      <div className="min-w-0 self-center pt-0.5">
        <h3 className="break-words text-[14px] font-semibold leading-tight text-white min-[380px]:text-[15px] sm:text-base">
          {title}
        </h3>
      </div>
      <div className="flex h-10 items-center justify-end self-center pt-0.5 min-[380px]:h-12 sm:h-[52px]">
        <ChevronIcon />
      </div>
      <div className="col-span-3 mt-2 min-w-0 min-[380px]:mt-2.5 sm:mt-3">
        {prose ? (
          children
        ) : (
          <div className="min-w-0 break-words text-[12px] leading-relaxed text-[#b4bcc9] min-[380px]:text-[13px] sm:text-[14px] sm:leading-relaxed">
            {children}
          </div>
        )}
      </div>
    </article>
  );
}

function valueState(value: MedicalValue) {
  if (value.estado === "normal") {
    return { dot: "bg-[#22c58a]", label: "Normal" };
  }

  if (value.estado === "atención") {
    return { dot: "bg-[#e8c547]", label: value.valor || "No evidente" };
  }

  return { dot: "bg-[#ff5d5d]", label: "Revisar" };
}

export function AnalysisResult({ result }: { result: AnalysisResponse }) {
  const explanationParts = splitExplanationIntoParagraphs(result.explicacion_general);
  const explanationBlocks =
    explanationParts.length > 0 ? explanationParts : [result.explicacion_general];
  let cardIndex = 0;
  const nextDelay = () => 60 + cardIndex++ * 90;

  return (
    <section className="min-w-0 space-y-3.5 sm:space-y-4" aria-live="polite">
      {result.urgencia === "urgente" ? (
        <div
          className="min-w-0 max-w-full rounded-2xl border border-red-400/35 bg-red-500/12 p-4 text-red-100 animate-fadeIn [will-change:transform,opacity]"
          style={{ animationDelay: "0ms" }}
        >
          <p className="break-words text-[14px] font-semibold min-[380px]:text-[15px] sm:text-base">Advertencia importante</p>
          <p className="mt-1.5 break-words text-[12px] leading-relaxed min-[380px]:text-[13px] sm:text-sm">
            Hay señales que podrían requerir atención médica urgente. Si tenés síntomas intensos, buscá ayuda ahora.
          </p>
        </div>
      ) : null}

      <ResultCard icon={<SummaryIcon />} iconClassName="bg-[#0d3d32] text-[#3dd4a5]" title="Resumen general" animationDelayMs={nextDelay()}>
        {result.resumen}
      </ResultCard>

      <ResultCard icon={<ChartIcon />} iconClassName="bg-[#0d3d32] text-[#3dd4a5]" title="Valores destacados" animationDelayMs={nextDelay()}>
        {result.valores.length > 0 ? (
          <ul className="divide-y divide-white/[0.06]">
            {result.valores.slice(0, 6).map((value, index) => {
              const state = valueState(value);

              return (
                <li key={`${value.nombre}-${index}`} className="flex items-start gap-1.5 py-2.5 first:pt-0 last:pb-0 min-[380px]:items-center min-[380px]:gap-2">
                  <span className="min-w-0 flex-1 break-words text-[12px] leading-snug text-[#d1d6df] min-[380px]:text-[13px] sm:text-[14px]">
                    {value.nombre}
                  </span>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full min-[380px]:mt-0 ${state.dot}`} aria-hidden />
                  <span className="w-[4.75rem] shrink-0 pt-0.5 text-right text-[11px] leading-snug text-[#b4bcc9] min-[380px]:w-[5.5rem] min-[380px]:pt-0 min-[380px]:text-[12px] sm:w-[92px] sm:text-[13px]">
                    {state.label}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No se identificaron valores puntuales.</p>
        )}
      </ResultCard>

      <ResultCard
        icon={<QuestionIcon />}
        iconClassName="bg-[#3b3525] text-[#ffcc45]"
        title="Qué significa esto"
        className="border-dotted"
        prose
        animationDelayMs={nextDelay()}
      >
        <div className="w-full max-w-full overflow-x-hidden rounded-lg border border-white/[0.04] bg-[#0a121c]/90 py-3.5 pl-3 pr-2.5 sm:py-5 sm:pl-5 sm:pr-4">
          <div
            className="space-y-4 border-l-[3px] border-[#c9a227]/35 pl-3 sm:space-y-6 sm:pl-5"
            role="region"
            aria-label="Explicación del estudio"
          >
            {explanationBlocks.map((paragraph, index) => (
              <p
                key={index}
                className="hyphens-auto text-pretty text-[13px] font-normal leading-[1.68] tracking-[0.01em] text-[#dce3ec] min-[380px]:text-[14px] min-[380px]:leading-[1.72] sm:text-[15px] sm:leading-[1.75]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </ResultCard>

      <ResultCard
        icon={<StethoscopeIcon />}
        iconClassName="bg-[#16335d] text-[#69a0ff]"
        title="Preguntas para tu médico"
        animationDelayMs={nextDelay()}
      >
        <ul className="list-disc space-y-1.5 pl-[1.1rem] marker:text-[#8b95a8]">
          {result.preguntas_medico.slice(0, 3).map((question, index) => (
            <li key={`${question}-${index}`} className="pl-0.5 text-[13px] leading-snug sm:text-[14px]">
              {question}
            </li>
          ))}
        </ul>
      </ResultCard>

      <article
        className={`${resultCardArticleClass} border-dotted border-[rgba(255,93,93,1)] animate-fadeIn [will-change:transform,opacity]`}
        style={{ animationDelay: `${nextDelay()}ms` }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] min-[380px]:h-12 min-[380px]:w-12 sm:h-[52px] sm:w-[52px]">
          <MediScanLogoMark className="h-7 w-7 text-medical sm:h-8 sm:w-8" />
        </div>
        <div className="min-w-0 self-center pt-0.5">
          <p className="text-[15px] font-semibold leading-tight text-white sm:text-base">Aviso importante</p>
        </div>
        <div className="flex h-10 items-center justify-end self-center pt-0.5 min-[380px]:h-12 sm:h-[52px]">
          <ChevronIcon />
        </div>
        <div className="col-span-3 mt-2 min-w-0 min-[380px]:mt-2.5 sm:mt-3">
          <p className="text-[12px] leading-relaxed text-[#9aa3b2] sm:text-[13px]">
            MediScan no reemplaza la opinión de un profesional de la salud. Esta información es educativa y no constituye diagnóstico médico.
          </p>
        </div>
      </article>
    </section>
  );
}
