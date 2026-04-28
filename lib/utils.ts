import { t, tList, type Locale } from "@/lib/i18n";
import type { AnalysisResponse, UrgenciaEstado, ValorEstado } from "@/lib/types";

const fileDataUrlPattern = /^data:((?:image\/(?:png|jpeg|jpg|webp|heic|heif))|application\/pdf);base64,([A-Za-z0-9+/=]+)$/i;

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

      reject(new Error("No se pudo leer el archivo seleccionado."));
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo seleccionado."));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("No se pudo leer la imagen procesada."));
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen procesada."));
    reader.readAsDataURL(blob);
  });
}

export async function compressImageFileToDataUrl(
  file: File,
  {
    maxBytes = 1_000_000,
    maxDimension = 2000
  }: {
    maxBytes?: number;
    maxDimension?: number;
  } = {}
): Promise<{ dataUrl: string; outputType: string; bytes: number }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se pueden comprimir imagenes.");
  }

  const bitmap = await createImageBitmap(file);
  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;
  const scale = Math.min(1, maxDimension / Math.max(targetWidth, targetHeight));
  targetWidth = Math.max(1, Math.round(targetWidth * scale));
  targetHeight = Math.max(1, Math.round(targetHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo inicializar el canvas para comprimir la imagen.");
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  let quality = 0.9;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (next) => resolve(next),
        "image/jpeg",
        quality
      );
    });

    if (!blob) {
      throw new Error("No se pudo generar una imagen comprimida.");
    }

    if (blob.size <= maxBytes) {
      const dataUrl = await blobToDataUrl(blob);
      return { dataUrl, outputType: blob.type || "image/jpeg", bytes: blob.size };
    }

    if (quality > 0.55) {
      quality = Math.max(0.5, quality - 0.1);
      continue;
    }

    const nextWidth = Math.max(1, Math.round(canvas.width * 0.85));
    const nextHeight = Math.max(1, Math.round(canvas.height * 0.85));
    if (nextWidth === canvas.width || nextHeight === canvas.height) {
      break;
    }

    const nextCanvas = document.createElement("canvas");
    nextCanvas.width = nextWidth;
    nextCanvas.height = nextHeight;
    const nextCtx = nextCanvas.getContext("2d");
    if (!nextCtx) {
      break;
    }
    nextCtx.drawImage(canvas, 0, 0, nextWidth, nextHeight);
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(nextCanvas, 0, 0);
  }

  throw new Error(`No se pudo comprimir la imagen por debajo de ${Math.round(maxBytes / 1000)} KB.`);
}

export function splitImageDataUrl(dataUrl: string): { mimeType: string; imageBase64: string } {
  const match = dataUrl.match(fileDataUrlPattern);

  if (!match) {
    throw new Error("The selected file does not appear to be a valid image or PDF.");
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
