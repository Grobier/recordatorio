import { RegistroEnvio } from "../types";

interface Props {
  envios: RegistroEnvio[];
}

export const HistorySection = ({ envios }: Props) => {
  return (
    <section>
      <h2>Historial de envíos</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Fecha envío</th>
              <th>Tipo</th>
              <th>Paciente</th>
              <th>Resultado</th>
              <th>Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {envios.map((e) => (
              <tr key={e.id}>
                <td>
                  {new Date(e.fechaEnvio).toLocaleString("es-CL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td>{e.tipoEnvio}</td>
                <td>{e.paciente?.nombreCompleto}</td>
                <td>{e.resultado}</td>
                <td className="muted">{e.mensajeError}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
