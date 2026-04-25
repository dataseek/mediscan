import { t, tList, type Locale } from "@/lib/i18n";
import type { AnalysisResponse, UrgenciaEstado, ValorEstado } from "@/lib/types";

const imageDataUrlPattern = /^data:(image\/(?:png|jpeg|jpg|webp|heic|heif));base64,([A-Za-z0-9+/=]+)$/i;

const explanationMaxBlockChars = 380;

function splitLongExplanationBlock(block: string): string[] {
  if (block.length <= explanationMaxBlockChars) {
    return [block];
  }

  const sentences = block.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 1) {
    return [block];
  }

  const out: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length > explanationMaxBlockChars && buffer) {
      out.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = candidate;
    }
  }

  if (buffer) {
    out.push(buffer.trim());
  }

  return out.length > 0 ? out : [block];
}

/** Splits model prose into blocks for readable multi-paragraph layout. */
export function splitExplanationIntoParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const byDoubleNewline = trimmed
    .split(/\n\s*\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (byDoubleNewline.length > 1) {
    return byDoubleNewline.flatMap((block) => splitLongExplanationBlock(block));
  }

  const bySingleNewline = trimmed
    .split(/\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (bySingleNewline.length > 1) {
    return bySingleNewline.flatMap((block) => splitLongExplanationBlock(block));
  }

  return splitLongExplanationBlock(trimmed);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("No se pudo leer la imagen seleccionada."));
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

export function splitImageDataUrl(dataUrl: string): { mimeType: string; imageBase64: string } {
  const match = dataUrl.match(imageDataUrlPattern);

  if (!match) {
    throw new Error("The selected file does not appear to be a valid image.");
  }

  const normalizedMimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();

  return {
    mimeType: normalizedMimeType,
    imageBase64: match[2]
  };
}

export function isValorEstado(value: string): value is ValorEstado {
  return value === "normal" || value === "atencion" || value === "revisar";
}

export function isUrgenciaEstado(value: string): value is UrgenciaEstado {
  return value === "normal" || value === "consultar-pronto" || value === "urgente";
}

function normalizeValorEstado(value: unknown): ValorEstado {
  if (typeof value !== "string") {
    return "revisar";
  }

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized === "normal") {
    return "normal";
  }

  if (normalized === "atencion") {
    return "atencion";
  }

  return "revisar";
}

function normalizeSpecialty(value: unknown, locale: Locale): string {
  if (typeof value !== "string") {
    return t(locale, "result.fallbacks.unknownValueName");
  }

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (normalized.includes("RECETA") || normalized.includes("PRESCRIP")) {
    return "RECETA_MEDICA";
  }

  return value.trim() || t(locale, "result.fallbacks.unknownValueName");
}

export function normalizeAnalysisResponse(input: unknown, locale: Locale = "es"): AnalysisResponse | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Record<string, unknown>;
  const valores = Array.isArray(candidate.valores)
    ? candidate.valores
        .map((valor) => {
          if (!valor || typeof valor !== "object") {
            return null;
          }

          const item = valor as Record<string, unknown>;
          const estado = normalizeValorEstado(item.estado);

          return {
            nombre:
              typeof item.nombre === "string" ? item.nombre : t(locale, "result.fallbacks.unknownValueName"),
            valor:
              typeof item.valor === "string" ? item.valor : t(locale, "result.fallbacks.valueNotReported"),
            estado,
            explicacion:
              typeof item.explicacion === "string"
                ? item.explicacion
                : t(locale, "result.fallbacks.unclearValueExplanation")
          };
        })
        .filter((valor): valor is NonNullable<typeof valor> => valor !== null)
    : [];

  const preguntasMedico = Array.isArray(candidate.preguntas_medico)
    ? candidate.preguntas_medico.filter((pregunta): pregunta is string => typeof pregunta === "string").slice(0, 5)
    : [];

  const urgencia =
    typeof candidate.urgencia === "string" && isUrgenciaEstado(candidate.urgencia) ? candidate.urgencia : "normal";

  return {
    tipo_estudio:
      typeof candidate.tipo_estudio === "string" ? candidate.tipo_estudio : t(locale, "result.fallbacks.studyTitle"),
    especialidad: normalizeSpecialty(candidate.especialidad, locale),
    resumen:
      typeof candidate.resumen === "string" ? candidate.resumen : t(locale, "result.fallbacks.summary"),
    valores,
    explicacion_general:
      typeof candidate.explicacion_general === "string"
        ? candidate.explicacion_general
        : t(locale, "result.fallbacks.generalExplanation"),
    preguntas_medico: preguntasMedico.length > 0 ? preguntasMedico : tList(locale, "result.fallbacks.questions"),
    urgencia,
    disclaimer:
      typeof candidate.disclaimer === "string"
        ? candidate.disclaimer
        : t(locale, "result.fallbacks.disclaimer")
  };
}

export function formatFileLoadedAtParts(ms: number, locale: Locale): { date: string; time: string } | null {
  if (!Number.isFinite(ms)) {
    return null;
  }

  const dateLocale = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-AR";
  const d = new Date(ms);
  const datePart = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
    .format(d)
    .replace(/\./g, "")
    .trim();
  const timePart = new Intl.DateTimeFormat(dateLocale, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);

  return {
    date: datePart,
    time: timePart
  };
}

export function formatFileLoadedAt(ms: number, locale: Locale): string {
  const parts = formatFileLoadedAtParts(ms, locale);

  return parts ? `${parts.date} - ${parts.time}` : "";
}
