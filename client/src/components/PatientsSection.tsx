import { useState } from "react";
import { api } from "../api";
import { Paciente } from "../types";

interface Props {
  pacientes: Paciente[];
  onCreated: () => Promise<void>;
  onUpdated: () => Promise<void>;
  onDeleted: () => Promise<void>;
  setMessage: (msg: string | null) => void;
}

export const PatientsSection = ({
  pacientes,
  onCreated,
  onUpdated,
  onDeleted,
  setMessage,
}: Props) => {
  const [form, setForm] = useState<Partial<Paciente>>({
    nombreCompleto: "",
    correo: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombreCompleto || !form.correo) {
      setMessage("Nombre y correo son obligatorios");
      return;
    }
    
    try {
      if (editingId) {
        await api.updatePaciente(editingId, form);
        setMessage("Paciente actualizado");
        setEditingId(null);
      } else {
        await api.createPaciente(form);
        setMessage("Paciente creado");
      }
      setForm({ nombreCompleto: "", correo: "", rut: "", telefono: "" });
      await onCreated();
    } catch (error: any) {
      console.error("Error al guardar paciente:", error);
      const errorMessage = error?.message || "Error al guardar paciente. Intenta de nuevo.";
      setMessage(`Error: ${errorMessage}`);
    }
  };

  const startEdit = (p: Paciente) => {
    setEditingId(p.id);
    setForm(p);
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar paciente y sus citas?")) return;
    
    try {
      await api.deletePaciente(id);
      setMessage("Paciente eliminado");
      await onDeleted();
    } catch (error: any) {
      console.error("Error al eliminar paciente:", error);
      const errorMessage = error?.message || "Error al eliminar paciente. Intenta de nuevo.";
      setMessage(`Error: ${errorMessage}`);
    }
  };

  return (
    <section>
      <h2>Pacientes</h2>
      <form className="card" onSubmit={handleSubmit}>
        <div className="grid">
          <label>
            Nombre completo*
            <input
              value={form.nombreCompleto || ""}
              onChange={(e) =>
                setForm({ ...form, nombreCompleto: e.target.value })
              }
              required
            />
          </label>
          <label>
            Correo*
            <input
              type="email"
              value={form.correo || ""}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              required
            />
          </label>
          <label>
            RUT
            <input
              value={form.rut || ""}
              onChange={(e) => setForm({ ...form, rut: e.target.value })}
            />
          </label>
          <label>
            Teléfono
            <input
              value={form.telefono || ""}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </label>
          <label>
            Observaciones
            <input
              value={form.observaciones || ""}
              onChange={(e) =>
                setForm({ ...form, observaciones: e.target.value })
              }
            />
          </label>
        </div>
        <div className="actions">
          <button type="submit">
            {editingId ? "Guardar cambios" : "Agregar paciente"}
          </button>
          {editingId && (
            <button type="button" onClick={() => setEditingId(null)}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>RUT</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id}>
                <td>{p.nombreCompleto}</td>
                <td>{p.correo}</td>
                <td>{p.telefono}</td>
                <td>{p.rut}</td>
                <td className="actions">
                  <button onClick={() => startEdit(p)}>Editar</button>
                  <button className="danger" onClick={() => remove(p.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
