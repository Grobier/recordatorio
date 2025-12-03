import { Cita, Paciente, RegistroEnvio, EstadoCita } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "";

const headers = { "Content-Type": "application/json" };

export const api = {
  async listPacientes(): Promise<Paciente[]> {
    const res = await fetch(`${API_URL}/api/pacientes`);
    return res.json();
  },
  async createPaciente(data: Partial<Paciente>) {
    const res = await fetch(`${API_URL}/api/pacientes`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updatePaciente(id: number, data: Partial<Paciente>) {
    const res = await fetch(`${API_URL}/api/pacientes/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deletePaciente(id: number) {
    const res = await fetch(`${API_URL}/api/pacientes/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },
  async listCitas(params?: {
    pacienteId?: number;
    estado?: EstadoCita;
    fecha?: string;
  }): Promise<Cita[]> {
    const query = new URLSearchParams();
    if (params?.pacienteId) query.set("pacienteId", String(params.pacienteId));
    if (params?.estado) query.set("estado", params.estado);
    if (params?.fecha) query.set("fecha", params.fecha);

    const res = await fetch(
      `${API_URL}/api/citas${query.toString() ? "?" + query.toString() : ""}`
    );
    return res.json();
  },
  async createCita(data: Partial<Cita>) {
    const res = await fetch(`${API_URL}/api/citas`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateCita(id: number, data: Partial<Cita>) {
    const res = await fetch(`${API_URL}/api/citas/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteCita(id: number) {
    const res = await fetch(`${API_URL}/api/citas/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },
  async sendCitaciones(citaIds: number[]) {
    const res = await fetch(`${API_URL}/api/email/citacion`, {
      method: "POST",
      headers,
      body: JSON.stringify({ citaIds }),
    });
    return res.json();
  },
  async sendComprobantes(citaIds: number[]) {
    const res = await fetch(`${API_URL}/api/email/comprobante`, {
      method: "POST",
      headers,
      body: JSON.stringify({ citaIds }),
    });
    return res.json();
  },
  async historialEnvios(): Promise<RegistroEnvio[]> {
    const res = await fetch(`${API_URL}/api/citas/historial/envios`);
    return res.json();
  },
  async config(): Promise<{ defaultProfesional?: string }> {
    const res = await fetch(`${API_URL}/api/config`);
    return res.json();
  },
};
