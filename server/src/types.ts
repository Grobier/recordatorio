export type EstadoCita = "PROGRAMADA" | "ASISTIDA" | "AUSENTE";
export type TipoEnvio = "CITACION" | "COMPROBANTE";
export type ResultadoEnvio = "OK" | "ERROR";

export interface CitacionEmailData {
  citaId: number;
  nombrePaciente: string;
  fechaSesion: Date;
  horaSesion: string;
  lugar: string;
  profesional: string;
  baseUrl?: string;
}

export interface ComprobanteEmailData extends CitacionEmailData {
  tipoPrestacion: string;
}
