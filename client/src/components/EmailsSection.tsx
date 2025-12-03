import { useState } from "react";
import { api } from "../api";
import { Cita } from "../types";

interface Props {
  citas: Cita[];
  selectedIds: number[];
  clearSelection: () => void;
  onSent: () => Promise<void>;
  setMessage: (msg: string | null) => void;
}

export const EmailsSection = ({
  citas,
  selectedIds,
  clearSelection,
  onSent,
  setMessage,
}: Props) => {
  const selectedCitas = citas.filter((c) => selectedIds.includes(c.id));
  const [sending, setSending] = useState<"citacion" | "comprobante" | null>(
    null
  );

  const send = async (tipo: "citacion" | "comprobante") => {
    console.log(`[UI] Botón ${tipo} presionado`);
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
      console.error(`[UI] ✗ ERROR en componente:`, error);
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
      <h2>Envio de correos</h2>
      <div className="card">
        <p>
          Seleccionadas: <strong>{selectedIds.length}</strong> citas.
        </p>
        <div className="actions">
          <button
            onClick={() => send("citacion")}
            disabled={!!sending}
            aria-busy={sending === "citacion"}
          >
            {sending === "citacion" ? "Enviando..." : "Enviar citaciones"}
          </button>
          <button
            onClick={() => send("comprobante")}
            disabled={!!sending}
            aria-busy={sending === "comprobante"}
          >
            Enviar comprobantes
          </button>
          <button onClick={clearSelection} disabled={!!sending}>
            Limpiar seleccion
          </button>
        </div>

        {sending && (
          <div className="loading-row">
            <span className="spinner" aria-hidden="true" />
            <span>
              Enviando correos de{" "}
              {sending === "citacion" ? "citacion" : "comprobante"}...
            </span>
          </div>
        )}

        {selectedCitas.length > 0 && (
          <ul className="chips">
            {selectedCitas.map((c) => (
              <li key={c.id}>
                {c.paciente.nombreCompleto} -{" "}
                {new Date(c.fechaSesion).toLocaleDateString()} {c.horaSesion} (
                {c.estado})
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
