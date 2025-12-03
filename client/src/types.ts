export type EstadoCita = "PROGRAMADA" | "ASISTIDA" | "AUSENTE";
export type TipoEnvio = "CITACION" | "COMPROBANTE";

export interface Paciente {
  id: number;
  nombreCompleto: string;
  rut?: string | null;
  correo: string;
  telefono?: string | null;
  observaciones?: string | null;
}

export interface Cita {
  id: number;
  pacienteId: number;
  paciente: Paciente;
  fechaSesion: string;
  horaSesion: string;
  lugar: string;
  profesional: string;
  tipoPrestacion: string;
  estado: EstadoCita;
  creadoEn: string;
}

export interface RegistroEnvio {
  id: number;
  tipoEnvio: TipoEnvio;
  citaId: number;
  pacienteId: number;
  fechaEnvio: string;
  resultado: "OK" | "ERROR";
  mensajeError?: string | null;
  paciente?: Paciente;
  cita?: Cita;
}
