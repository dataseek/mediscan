export type ValorEstado = "normal" | "atención" | "revisar";

export type UrgenciaEstado = "normal" | "consultar-pronto" | "urgente";

export interface MedicalValue {
  nombre: string;
  valor: string;
  estado: ValorEstado;
  explicacion: string;
}

export interface AnalysisResponse {
  tipo_estudio: string;
  resumen: string;
  valores: MedicalValue[];
  explicacion_general: string;
  preguntas_medico: string[];
  urgencia: UrgenciaEstado;
  disclaimer: string;
}

export interface AnalyzeApiSuccess {
  result: AnalysisResponse;
}

export interface AnalyzeApiError {
  error: string;
}

export type AnalyzeApiResponse = AnalyzeApiSuccess | AnalyzeApiError;
