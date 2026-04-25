import { NextResponse } from "next/server";
import { normalizeAnalysisResponse } from "@/lib/utils";

export const runtime = "edge";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-sonnet-4";
const maxImageBase64Length = 18 * 1024 * 1024;
const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]);

const systemPrompt = `Eres un asistente médico educativo. Tu función es ayudar a personas comunes a entender sus estudios médicos ANTES de ir al médico.

REGLAS ESTRICTAS:
- Responde siempre en español rioplatense claro y accesible
- Usa lenguaje simple, sin jerga técnica innecesaria
- Si hay valores fuera de rango, explica qué podría significar en términos generales
- NUNCA des un diagnóstico definitivo
- NUNCA recomiendes medicamentos específicos
- Si algo parece urgente o crítico, indicarlo claramente con una advertencia visual
- Siempre finalizar recordando consultar al médico

FORMATO DE RESPUESTA (responder SIEMPRE en JSON válido):
{
  "tipo_estudio": "string — nombre del tipo de estudio identificado",
  "resumen": "string — qué evalúa este estudio en 2-3 oraciones simples",
  "valores": [
    {
      "nombre": "string",
      "valor": "string",
      "estado": "normal | atención | revisar",
      "explicacion": "string — qué significa este valor en lenguaje simple"
    }
  ],
  "explicacion_general": "string — explicación en 2-4 párrafos cortos; dejá una línea en blanco entre párrafo y párrafo (doble salto de línea en el texto)",
  "preguntas_medico": ["string", "string", "string"],
  "urgencia": "normal | consultar-pronto | urgente",
  "disclaimer": "Este análisis es informativo y no reemplaza la consulta médica profesional."
}`;

interface AnalyzeRequestBody {
  imageBase64?: unknown;
  mimeType?: unknown;
}

interface OpenRouterMessage {
  role?: string;
  content?: unknown;
}

interface OpenRouterChoice {
  message?: OpenRouterMessage;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: {
    message?: string;
  };
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isValidBase64(value: string) {
  if (!value || value.length > maxImageBase64Length) {
    return false;
  }

  return /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0;
}

function extractJsonText(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const textParts = content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }

      const record = part as Record<string, unknown>;
      return typeof record.text === "string" ? record.text : "";
    })
    .filter(Boolean);

  return textParts.length > 0 ? textParts.join("\n") : null;
}

function parseModelJson(content: string): unknown {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fencedMatch?.[1] ?? trimmed;
  return JSON.parse(jsonText);
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;

  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return jsonError("El cuerpo de la solicitud no es JSON válido.", 400);
  }

  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";

  if (!supportedMimeTypes.has(mimeType)) {
    return jsonError("Formato de imagen no soportado. Usá PNG, JPG, WebP o HEIC.", 400);
  }

  if (!isValidBase64(imageBase64)) {
    return jsonError("La imagen no tiene un formato base64 válido.", 400);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return jsonError("Falta configurar OPENROUTER_API_KEY en el entorno.", 500);
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mediscan.local",
        "X-Title": "MediScan"
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Analizá esta imagen de un estudio médico. Si no podés leerla con seguridad, devolvé JSON válido explicando que hace falta una foto más clara."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      })
    });

    const openRouterData = (await response.json()) as OpenRouterResponse;

    if (!response.ok) {
      return jsonError(
        openRouterData.error?.message ?? "OpenRouter no pudo procesar la imagen en este momento.",
        response.status
      );
    }

    const content = extractJsonText(openRouterData.choices?.[0]?.message?.content);

    if (!content) {
      return jsonError("El modelo no devolvió una respuesta legible. Probá con una imagen más clara.", 502);
    }

    const parsed = parseModelJson(content);
    const normalized = normalizeAnalysisResponse(parsed);

    if (!normalized) {
      return jsonError("La respuesta del modelo llegó malformada. Probá nuevamente.", 502);
    }

    return NextResponse.json({ result: normalized });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("La respuesta del modelo no fue JSON válido. Probá de nuevo con una imagen más nítida.", 502);
    }

    return jsonError("No pudimos conectar con el servicio de análisis. Intentá nuevamente en unos minutos.", 502);
  }
}
