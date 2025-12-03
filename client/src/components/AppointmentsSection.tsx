import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Cita, EstadoCita, Paciente } from "../types";

export type AppointmentSelection = Record<number, boolean>;

interface Props {
  pacientes: Paciente[];
  citas: Cita[];
  selection: AppointmentSelection;
  toggleSelection: (id: number) => void;
  clearSelection: () => void;
  onCreated: () => Promise<void>;
  onUpdated: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onSent: () => Promise<void>;
  setMessage: (msg: string | null) => void;
  defaultProfesional: string;
}

const estados: EstadoCita[] = ["PROGRAMADA", "ASISTIDA", "AUSENTE"];

export const AppointmentsSection = ({
  pacientes,
  citas,
  selection,
  toggleSelection,
  clearSelection,
  onCreated,
  onUpdated,
  onDeleted,
  onSent,
  setMessage,
  defaultProfesional,
}: Props) => {
  const selectedIds = useMemo(
    () =>
      Object.keys(selection)
        .filter((id) => selection[Number(id)] === true)
        .map(Number),
    [selection]
  );

  const [sending, setSending] = useState<"citacion" | "comprobante" | null>(
    null
  );
  const [form, setForm] = useState({
    pacienteId: "",
    fechaSesion: "",
    horaSesion: "",
    lugar: "Box Kutral",
    profesional: "",
    tipoPrestacion: "Kinesiologia musculo-esqueletica",
    estado: "PROGRAMADA" as EstadoCita,
  });
  const [filters, setFilters] = useState<{
    pacienteId?: string;
    fecha?: string;
    estado?: EstadoCita | "";
  }>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  // Si hay un defaultProfesional configurado y el campo esta vacio, prellenar
  useEffect(() => {
    if (!form.profesional && defaultProfesional) {
      setForm((prev) => ({ ...prev, profesional: defaultProfesional }));
    }
  }, [defaultProfesional]);

  const filteredCitas = useMemo(() => {
    return citas.filter((c) => {
      const matchPaciente = filters.pacienteId
        ? c.pacienteId === Number(filters.pacienteId)
        : true;
      const matchEstado = filters.estado ? c.estado === filters.estado : true;
      const matchFecha = filters.fecha
        ? new Date(c.fechaSesion).toISOString().slice(0, 10) === filters.fecha
        : true;
      return matchPaciente && matchEstado && matchFecha;
    });
  }, [citas, filters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pacienteId || !form.fechaSesion || !form.horaSesion) {
      setMessage("Paciente, fecha y hora son obligatorios");
      return;
    }

    if (editingId) {
      await api.updateCita(editingId, {
        ...form,
        pacienteId: Number(form.pacienteId),
      });
      setMessage("Cita actualizada");
      setEditingId(null);
    } else {
      await api.createCita({
        ...form,
        pacienteId: Number(form.pacienteId),
      });
      setMessage("Cita creada");
    }
    await onCreated();
    setForm({
      pacienteId: "",
      fechaSesion: "",
      horaSesion: "",
      lugar: "Box Kutral",
      profesional: "",
      tipoPrestacion: "Kinesiologia musculo-esqueletica",
      estado: "PROGRAMADA",
    });
  };

  const startEdit = (c: Cita) => {
    setEditingId(c.id);
    setForm({
      pacienteId: String(c.pacienteId),
      fechaSesion: c.fechaSesion.slice(0, 10),
      horaSesion: c.horaSesion,
      lugar: c.lugar,
      profesional: c.profesional,
      tipoPrestacion: c.tipoPrestacion,
      estado: c.estado,
    });
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar cita?")) return;
    await api.deleteCita(id);
    setMessage("Cita eliminada");
    await onDeleted();
  };

  const sendEmails = async (tipo: "citacion" | "comprobante") => {
    console.log(`[UI] Botón ${tipo} presionado (AppointmentsSection)`);
    console.log(`[UI] Citas seleccionadas:`, selectedIds);
    
    if (selectedIds.length === 0) {
      console.log(`[UI] ERROR: No hay citas seleccionadas`);
      setMessage("Selecciona al menos una cita");
      return;
    }
    
    console.log(`[UI] Estableciendo estado de envío a: ${tipo}`);
    setSending(tipo);
    try {
      console.log(`[UI] Llamando API para enviar ${tipo}...`);
      const response =
        tipo === "citacion"
          ? await api.sendCitaciones(selectedIds)
          : await api.sendComprobantes(selectedIds);
      
      console.log(`[UI] Respuesta recibida:`, response);

      const ok = response.resultados?.filter((r: any) => r.status === "OK")
        .length;
      const errors = response.resultados?.filter(
        (r: any) => r.status === "ERROR"
      ).length;

      setMessage(
        `Correos enviados. OK: ${ok || 0} / Errores: ${errors || 0}${
          response.noAsistidas?.length
            ? ` | No marcadas como ASISTIDA: ${response.noAsistidas.join(", ")}`
            : ""
        }`
      );
      console.log(`[UI] Llamando onSent callback...`);
      await onSent();
      console.log(`[UI] Limpiando selección...`);
      clearSelection();
      console.log(`[UI] ✓ Proceso completado exitosamente`);
    } catch (error: any) {
      console.error(`[UI] ✗ ERROR en componente (AppointmentsSection):`, error);
      console.error(`[UI] Stack trace:`, error?.stack);
      const errorMessage = error?.message || "No se pudieron enviar los correos. Intentalo de nuevo.";
      console.log(`[UI] Mostrando mensaje de error al usuario: ${errorMessage}`);
      setMessage(`Error: ${errorMessage}`);
    } finally {
      console.log(`[UI] Limpiando estado de envío`);
      setSending(null);
    }
  };

  return (
    <section>
      <h2>Citas</h2>

      <form className="card" onSubmit={handleSubmit}>
        <div className="grid">
          <label>
            Paciente*
            <select
              value={form.pacienteId}
              onChange={(e) => setForm({ ...form, pacienteId: e.target.value })}
              required
            >
              <option value="">Selecciona...</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombreCompleto}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha*
            <input
              type="date"
              value={form.fechaSesion}
              onChange={(e) => setForm({ ...form, fechaSesion: e.target.value })}
              required
            />
          </label>
          <label>
            Hora*
            <input
              type="time"
              value={form.horaSesion}
              onChange={(e) => setForm({ ...form, horaSesion: e.target.value })}
              required
            />
          </label>
          <label>
            Lugar
            <input
              value={form.lugar}
              onChange={(e) => setForm({ ...form, lugar: e.target.value })}
            />
          </label>
          <label>
            Profesional
            <input
              value={form.profesional}
              onChange={(e) =>
                setForm({ ...form, profesional: e.target.value })
              }
              placeholder={
                defaultProfesional
                  ? `Se usara ${defaultProfesional} si lo dejas vacio`
                  : "Se usara DEFAULT_PROFESIONAL si lo dejas vacio"
              }
            />
          </label>
          <label>
            Tipo de prestacion
            <input
              value={form.tipoPrestacion}
              onChange={(e) =>
                setForm({ ...form, tipoPrestacion: e.target.value })
              }
            />
          </label>
          <label>
            Estado
            <select
              value={form.estado}
              onChange={(e) =>
                setForm({ ...form, estado: e.target.value as EstadoCita })
              }
            >
              {estados.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <button type="submit">
            {editingId ? "Guardar cambios" : "Crear cita"}
          </button>
          {editingId && (
            <button type="button" onClick={() => setEditingId(null)}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <div className="filters">
          <select
            value={filters.pacienteId || ""}
            onChange={(e) =>
              setFilters({ ...filters, pacienteId: e.target.value || undefined })
            }
          >
            <option value="">Paciente (todos)</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombreCompleto}
              </option>
            ))}
          </select>
          <select
            value={filters.estado || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                estado: (e.target.value as EstadoCita) || "",
              })
            }
          >
            <option value="">Estado (todos)</option>
            {estados.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.fecha || ""}
            onChange={(e) =>
              setFilters({ ...filters, fecha: e.target.value || undefined })
            }
          />
          <button onClick={() => setFilters({})}>Limpiar filtros</button>
        </div>

        <table>
          <thead>
            <tr>
              <th></th>
              <th>Paciente</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Estado</th>
              <th>Profesional</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredCitas.map((c) => (
              <tr key={c.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selection[c.id] || false}
                    onChange={() => toggleSelection(c.id)}
                    title="Seleccionar para envio"
                  />
                </td>
                <td>{c.paciente?.nombreCompleto}</td>
                <td>{new Date(c.fechaSesion).toLocaleDateString()}</td>
                <td>{c.horaSesion}</td>
                <td>{c.estado}</td>
                <td>{c.profesional}</td>
                <td className="actions">
                  <button onClick={() => startEdit(c)}>Editar</button>
                  <button className="danger" onClick={() => remove(c.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="actions" style={{ marginTop: 12 }}>
          <span className="muted">
            Seleccionadas: <strong>{selectedIds.length}</strong>
          </span>
          <button
            onClick={() => sendEmails("citacion")}
            disabled={!!sending}
            aria-busy={sending === "citacion"}
          >
            {sending === "citacion" ? "Enviando..." : "Enviar citacion"}
          </button>
          <button
            onClick={() => sendEmails("comprobante")}
            disabled={!!sending}
            aria-busy={sending === "comprobante"}
          >
            Enviar comprobante
          </button>
          <button onClick={clearSelection} disabled={!!sending}>
            Limpiar seleccion
          </button>
        </div>
      </div>
    </section>
  );
};
