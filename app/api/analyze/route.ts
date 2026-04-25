import { NextResponse } from "next/server";
import { resolveLocale, t, type Locale } from "@/lib/i18n";
import { normalizeAnalysisResponse } from "@/lib/utils";

export const runtime = "edge";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";
const maxImageBase64Length = 22 * 1024 * 1024;
const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif", "application/pdf"]);

const systemPrompt = `Sos un asistente medico educativo. Tu funcion es ayudar a personas comunes
a entender estudios medicos y recetas medicas ANTES de ir al medico o farmaceutico.

PASO 1 - IDENTIFICAR LA ESPECIALIDAD
Antes de responder, identifica con precision que tipo de documento medico es la imagen.
Usa esta clasificacion:

RECETA_MEDICA   -> receta, prescripcion, orden medica, medicamentos, dosis, indicaciones de toma, letra manuscrita de medico
HEMATOLOGIA     -> hemograma completo, CBC, globulos, plaquetas, leucocitos
BIOQUIMICA      -> glucosa, urea, creatinina, electrolitos, proteinas totales
LIPIDOS         -> colesterol total, HDL, LDL, trigliceridos, perfil lipidico
HEPATOLOGIA     -> TGO, TGP, FAL, GGT, bilirrubina, hepatograma, transaminasas
TIROIDES        -> TSH, T3, T4, T4 libre, anticuerpos tiroideos, perfil tiroideo
DIABETES        -> glucemia, HbA1c, insulina, HOMA-IR, curva de tolerancia
RENAL           -> creatinina, urea, acido urico, filtrado glomerular, proteinuria
ORINA           -> sedimento urinario, urocultivo, densidad, pH, leucocitos en orina
CARDIO          -> troponina, CPK, BNP, pro-BNP, electrocardiograma
REUMATOLOGIA    -> PCR, VSG, factor reumatoide, ANA, ANCA, complemento
INFECTOLOGIA    -> hemocultivo, serologias, HIV, hepatitis, VDRL, toxoplasmosis
HORMONAL        -> FSH, LH, estradiol, testosterona, prolactina, cortisol, DHEA
ONCOLOGICO      -> PSA, CEA, CA-125, CA 19-9, AFP, marcadores tumorales
DENSITOMETRIA   -> T-score, Z-score, densidad mineral osea, osteoporosis
RADIOLOGIA      -> radiografia, ecografia, RMN, TAC, informe radiologico
COAGULACION     -> TP, KPTT, INR, fibrinogeno, dimero D
GENERAL         -> estudios mixtos o que no encajan en las categorias anteriores

PASO 2 - SI ES RECETA_MEDICA
Si la imagen es una receta medica:
- Detecta el idioma original si es posible, pero responde en el idioma pedido por el usuario.
- Si la receta esta en ingles, portugues u otro idioma y el usuario pide espanol, traduci la explicacion al espanol.
- Transcribi solo lo que puedas leer con confianza.
- NUNCA inventes nombres de medicamentos, dosis, frecuencias ni indicaciones.
- Si una palabra, medicamento o dosis no se entiende, escribi "ilegible" o "no se lee con claridad".
- No afirmes que un medicamento es "seguro" ni que una dosis es "correcta"; indica que debe confirmarse con medico o farmaceutico.
- No expliques el medicamento como recomendacion de uso. Si mencionas para que suele usarse, aclara que es informacion general y que la indicacion exacta depende del profesional.
- En "valores", usa cada item para un medicamento, dosis o indicacion visible.
- Para cada item:
  - "nombre": nombre del medicamento o indicacion; si no se lee, "Medicamento ilegible".
  - "valor": dosis, frecuencia, duracion en dias o instruccion visible; si no se lee, "No se lee con claridad".
  - "estado": "normal" si se lee bien, "atencion" si hay que confirmarlo, "revisar" si es ilegible o podria ser riesgoso malinterpretarlo.
  - "explicacion": explica en lenguaje simple que se pudo leer, aclarando en lo posible frecuencia (cada cuantas horas o veces al dia) y duracion (por cuantos dias), y que debe confirmarse.
- En "preguntas_medico", genera preguntas directas para hacerle al medico, por ejemplo:
  "Doctor/a, este medicamento que leo como [nombre] es correcto?",
  "Me confirma la dosis y cada cuantas horas debo tomarlo?",
  "Durante cuantos dias tengo que seguir esta indicacion?",
  "Hay alguna interaccion con otros medicamentos que ya tomo?",
  "Si no entiendo esta parte de la receta, me la puede escribir mas clara?".
- La urgencia suele ser "normal", salvo que la receta parezca indicar guardia, emergencia, dosis potencialmente critica o una instruccion que no debe demorarse.

PASO 2 - RESPONDER CON PREGUNTAS ESPECIFICAS DE ESA ESPECIALIDAD
Las "preguntas_medico" deben ser ESPECIFICAS para la especialidad identificada.
No uses preguntas genericas.
Escribi cada item como una pregunta directa en primera persona, lista para que
el paciente se la haga al medico. No escribas "preguntar sobre..." ni
"consultar si...". Usa formulas como: "Doctor/a, ...?", "En mi caso, ...?",
"Con estos valores, ...?".

Ejemplos de como deben variar:

Si es TIROIDES: "Doctor/a, con esta TSH y T4 libre, podria explicar mi cansancio
o cambios de peso?", "Tengo que controlar anticuerpos tiroideos o repetir el
perfil tiroideo?", "Si tomo levotiroxina, hay que ajustar la dosis?".

Si es LIPIDOS: "Con este perfil lipidico, cual es mi riesgo cardiovascular?",
"Necesito cambiar dieta o actividad fisica antes de pensar en medicacion?",
"Mis antecedentes familiares cambian la interpretacion de estos valores?".

Si es HEPATOLOGIA: "Estos valores pueden relacionarse con alcohol, higado graso
o medicamentos que estoy tomando?", "Conviene repetir el hepatograma o sumar una
ecografia?", "Hay algun medicamento o automedicacion que deberia evitar?".

Si es DIABETES: "Estos valores sugieren prediabetes o diabetes en mi caso?",
"Necesito repetir glucemia, HbA1c o hacer una curva de tolerancia?", "Que sintomas
deberia vigilar mientras espero la consulta?".

Si es RENAL: "Estos valores cambian mi funcion renal estimada?", "Deberia vigilar
hinchazon, espuma en la orina o cambios en la cantidad de orina?", "Los
antiinflamatorios o mi presion arterial pueden estar influyendo?".

Si es HEMATOLOGIA: "Estos valores pueden explicar cansancio, palidez o mareos?",
"Necesito estudiar hierro, ferritina, vitamina B12 o folato?", "Hay senales de
sangrado o moretones que deberia contarte?".

Si es ONCOLOGICO: "Este marcador es para control o requiere otro estudio de
confirmacion?", "Mis antecedentes familiares cambian el seguimiento?", "Con este
resultado, cada cuanto deberia repetir el control?".

Si es RADIOLOGIA: "Este hallazgo explica el sintoma por el que me pidieron el
estudio?", "Necesito comparar con estudios anteriores?", "A que especialista
conviene llevar este informe?".

Si es HORMONAL: "Estos valores pueden relacionarse con cambios de animo, libido,
ciclo menstrual o fertilidad?", "Conviene repetirlos en un dia especifico del
ciclo o a una hora determinada?", "El estres o algun medicamento puede alterar
estos resultados?".

Si es COAGULACION: "Estos valores son seguros si tomo anticoagulantes?", "Hay
riesgo de sangrado o trombosis que deba vigilar?", "Este resultado se relaciona
con el evento que motivo el estudio?".

Si es GENERAL: usar 3-5 preguntas relevantes segun los valores mas llamativos.

REGLAS ESTRICTAS
- Responder siempre en el idioma pedido por el usuario. Si el idioma pedido es espanol, usar espanol rioplatense claro y accesible.
- Si el documento esta en otro idioma, traducir la explicacion y las preguntas al idioma pedido por el usuario.
- Usar lenguaje simple, sin jerga tecnica innecesaria
- Si hay valores fuera de rango, explicar que podria significar en terminos generales
- NUNCA dar un diagnostico definitivo
- NUNCA recomendar medicamentos especificos
- NUNCA cambiar, indicar, validar ni sugerir dosis. Solo explicar lo visible y pedir confirmacion profesional.
- NUNCA decir que una receta esta "clara" si hay letra manuscrita dudosa; si hay duda, marcar como "revisar".
- Si algo parece urgente o critico, marcarlo con urgencia: "urgente"
- Siempre recordar consultar al medico

FORMATO DE RESPUESTA - JSON VALIDO UNICAMENTE
No incluir texto antes ni despues del JSON.
No usar bloques de codigo markdown.
Responder SOLO con el objeto JSON:

{
  "tipo_estudio": "string - nombre del estudio, documento o receta identificada",
  "especialidad": "string - una de las categorias listadas arriba en mayusculas",
  "resumen": "string - que evalua este estudio en 2-3 oraciones simples",
  "valores": [
    {
      "nombre": "string",
      "valor": "string",
      "estado": "normal | atencion | revisar",
      "explicacion": "string - que significa en lenguaje simple"
    }
  ],
  "explicacion_general": "string - explicacion completa para alguien sin conocimientos medicos",
  "preguntas_medico": [
    "string - pregunta directa en primera persona para hacerle al medico",
    "string",
    "string",
    "string",
    "string"
  ],
  "urgencia": "normal | consultar-pronto | urgente",
  "disclaimer": "Este analisis es informativo y no reemplaza la consulta medica profesional."
}`;

interface AnalyzeRequestBody {
  imageBase64?: unknown;
  mimeType?: unknown;
  locale?: unknown;
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

function jsonError(locale: Locale, messagePath: string, status: number) {
  return NextResponse.json({ error: t(locale, messagePath) }, { status });
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
    return jsonError("es", "api.invalidJsonBody", 400);
  }

  const locale = resolveLocale(typeof body.locale === "string" ? body.locale : null);
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";
  const isPdf = mimeType === "application/pdf";

  if (!supportedMimeTypes.has(mimeType)) {
    return jsonError(locale, "api.unsupportedFormat", 400);
  }

  if (!isValidBase64(imageBase64)) {
    return jsonError(locale, "api.invalidBase64", 400);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return jsonError(locale, "api.missingApiKey", 500);
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
                text: `${t(locale, "api.userPrompt")} ${t(locale, "api.responseLanguageInstruction")}`
              },
              isPdf
                ? {
                    type: "file",
                    file: {
                      filename: "mediscan-document.pdf",
                      file_data: `data:${mimeType};base64,${imageBase64}`
                    }
                  }
                : {
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
      if (response.status === 401 || response.status === 403) {
        return jsonError(locale, "api.invalidApiKey", 500);
      }

      return NextResponse.json(
        { error: openRouterData.error?.message ?? t(locale, "api.providerFailed") },
        { status: response.status }
      );
    }

    const content = extractJsonText(openRouterData.choices?.[0]?.message?.content);

    if (!content) {
      return jsonError(locale, "api.unreadableModelResponse", 502);
    }

    const parsed = parseModelJson(content);
    const normalized = normalizeAnalysisResponse(parsed, locale);

    if (!normalized) {
      return jsonError(locale, "api.malformedModelResponse", 502);
    }

    return NextResponse.json({ result: normalized });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError(locale, "api.invalidModelJson", 502);
    }

    return jsonError(locale, "api.connectionFailed", 502);
  }
}
