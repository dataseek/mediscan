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
    throw new Error("El archivo seleccionado no parece ser una imagen válida.");
  }

  const normalizedMimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();

  return {
    mimeType: normalizedMimeType,
    imageBase64: match[2]
  };
}

export function isValorEstado(value: string): value is ValorEstado {
  return value === "normal" || value === "atención" || value === "revisar";
}

export function isUrgenciaEstado(value: string): value is UrgenciaEstado {
  return value === "normal" || value === "consultar-pronto" || value === "urgente";
}

export function normalizeAnalysisResponse(input: unknown): AnalysisResponse | null {
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
          const estado = typeof item.estado === "string" && isValorEstado(item.estado) ? item.estado : "revisar";

          return {
            nombre: typeof item.nombre === "string" ? item.nombre : "Valor sin identificar",
            valor: typeof item.valor === "string" ? item.valor : "No informado",
            estado,
            explicacion:
              typeof item.explicacion === "string"
                ? item.explicacion
                : "No se pudo interpretar este valor con claridad."
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
    tipo_estudio: typeof candidate.tipo_estudio === "string" ? candidate.tipo_estudio : "Estudio médico",
    resumen:
      typeof candidate.resumen === "string"
        ? candidate.resumen
        : "No se pudo obtener un resumen confiable del estudio.",
    valores,
    explicacion_general:
      typeof candidate.explicacion_general === "string"
        ? candidate.explicacion_general
        : "La imagen no permitió generar una explicación completa. Probá subir una foto más nítida.",
    preguntas_medico:
      preguntasMedico.length > 0
        ? preguntasMedico
        : ["¿Qué significa este resultado en mi caso particular?", "¿Necesito repetir o complementar este estudio?"],
    urgencia,
    disclaimer:
      typeof candidate.disclaimer === "string"
        ? candidate.disclaimer
        : "Este análisis es informativo y no reemplaza la consulta médica profesional."
  };
}

/** Fecha/hora de `File.lastModified` para la tarjeta “Estudio cargado” (es · separador). */
export function formatFileLoadedAt(ms: number): string {
  if (!Number.isFinite(ms)) {
    return "";
  }
  const d = new Date(ms);
  const datePart = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric"
  })
    .format(d)
    .replace(/\./g, "")
    .trim();
  const timePart = new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
  return `${datePart} · ${timePart}`;
}
