import { Cita, Paciente, RegistroEnvio, EstadoCita } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "";

const headers = { "Content-Type": "application/json" };

// Función auxiliar para manejar respuestas y errores
async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type");
  
  // Verificar si la respuesta es HTML en lugar de JSON
  if (contentType && contentType.includes("text/html")) {
    const text = await res.text();
    console.error("Error: Se recibió HTML en lugar de JSON. Respuesta:", text.substring(0, 200));
    throw new Error(
      `Error de configuración: La API no está disponible. ` +
      `Verifica que VITE_API_URL esté configurada correctamente. ` +
      `URL actual: ${API_URL || "(vacía)"}`
    );
  }
  
  if (!res.ok) {
    throw new Error(`Error HTTP: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}

export const api = {
  async listPacientes(): Promise<Paciente[]> {
    const res = await fetch(`${API_URL}/api/pacientes`);
    return handleResponse<Paciente[]>(res);
  },
  async createPaciente(data: Partial<Paciente>) {
    const res = await fetch(`${API_URL}/api/pacientes`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  async updatePaciente(id: number, data: Partial<Paciente>) {
    const res = await fetch(`${API_URL}/api/pacientes/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  async deletePaciente(id: number) {
    const res = await fetch(`${API_URL}/api/pacientes/${id}`, {
      method: "DELETE",
    });
    return handleResponse(res);
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
    return handleResponse<Cita[]>(res);
  },
  async createCita(data: Partial<Cita>) {
    const res = await fetch(`${API_URL}/api/citas`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  async updateCita(id: number, data: Partial<Cita>) {
    const res = await fetch(`${API_URL}/api/citas/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  async deleteCita(id: number) {
    const res = await fetch(`${API_URL}/api/citas/${id}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },
  async sendCitaciones(citaIds: number[]) {
    const res = await fetch(`${API_URL}/api/email/citacion`, {
      method: "POST",
      headers,
      body: JSON.stringify({ citaIds }),
    });
    return handleResponse(res);
  },
  async sendComprobantes(citaIds: number[]) {
    const res = await fetch(`${API_URL}/api/email/comprobante`, {
      method: "POST",
      headers,
      body: JSON.stringify({ citaIds }),
    });
    return handleResponse(res);
  },
  async historialEnvios(): Promise<RegistroEnvio[]> {
    const res = await fetch(`${API_URL}/api/citas/historial/envios`);
    return handleResponse<RegistroEnvio[]>(res);
  },
  async config(): Promise<{ defaultProfesional?: string }> {
    const res = await fetch(`${API_URL}/api/config`);
    return handleResponse<{ defaultProfesional?: string }>(res);
  },
};
