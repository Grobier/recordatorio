import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import {
  AppointmentsSection,
  AppointmentSelection,
} from "./components/AppointmentsSection";
import { EmailsSection } from "./components/EmailsSection";
import { HistorySection } from "./components/HistorySection";
import { PatientsSection } from "./components/PatientsSection";
import { Cita, Paciente, RegistroEnvio } from "./types";

type Tab = "pacientes" | "citas" | "envios" | "historial";

function App() {
  const [tab, setTab] = useState<Tab>("pacientes");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [envios, setEnvios] = useState<RegistroEnvio[]>([]);
  const [selection, setSelection] = useState<AppointmentSelection>({});
  const [message, setMessage] = useState<string | null>(null);
  const [defaultProfesional, setDefaultProfesional] = useState<string>("");

  const selectedIds = useMemo(
    () => Object.keys(selection).filter((id) => selection[Number(id)] === true).map(Number),
    [selection]
  );

  const loadPacientes = async () => {
    const data = await api.listPacientes();
    setPacientes(data);
  };

  const loadCitas = async () => {
    const data = await api.listCitas();
    setCitas(data);
  };

  const loadEnvios = async () => {
    const data = await api.historialEnvios();
    setEnvios(data);
  };

  useEffect(() => {
    loadPacientes();
    loadCitas();
    loadEnvios();
    api
      .config()
      .then((cfg) => setDefaultProfesional(cfg.defaultProfesional || ""))
      .catch(() => {});
  }, []);

  const toggleSelection = (id: number) => {
    setSelection((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const clearSelection = () => setSelection({});

  return (
    <div className="app">
      <header>
        <h1>Citas y correos de kinesiología</h1>
        <nav>
          <button
            className={tab === "pacientes" ? "active" : ""}
            onClick={() => setTab("pacientes")}
          >
            Pacientes
          </button>
          <button
            className={tab === "citas" ? "active" : ""}
            onClick={() => setTab("citas")}
          >
            Citas
          </button>
          <button
            className={tab === "envios" ? "active" : ""}
            onClick={() => setTab("envios")}
          >
            Envío de correos
          </button>
          <button
            className={tab === "historial" ? "active" : ""}
            onClick={() => setTab("historial")}
          >
            Historial
          </button>
        </nav>
      </header>

      {message && (
        <div className="toast" onClick={() => setMessage(null)}>
          {message}
        </div>
      )}

      <main>
        {tab === "pacientes" && (
          <PatientsSection
            pacientes={pacientes}
            onCreated={async () => {
              await loadPacientes();
            }}
            onUpdated={async () => {
              await loadPacientes();
            }}
            onDeleted={async () => {
              await loadPacientes();
              await loadCitas();
              clearSelection();
            }}
            setMessage={setMessage}
          />
        )}

        {tab === "citas" && (
          <AppointmentsSection
            pacientes={pacientes}
            citas={citas}
            onCreated={async () => {
              await loadCitas();
            }}
            onUpdated={async () => {
              await loadCitas();
            }}
            onDeleted={async () => {
              await loadCitas();
              clearSelection();
            }}
            selection={selection}
            toggleSelection={toggleSelection}
            clearSelection={clearSelection}
            onSent={async () => {
              await loadEnvios();
            }}
            setMessage={setMessage}
            defaultProfesional={defaultProfesional}
          />
        )}

        {tab === "envios" && (
          <EmailsSection
            citas={citas}
            selectedIds={selectedIds}
            clearSelection={clearSelection}
            onSent={async () => {
              await loadEnvios();
            }}
            setMessage={setMessage}
          />
        )}

        {tab === "historial" && <HistorySection envios={envios} />}
      </main>
    </div>
  );
}

export default App;
