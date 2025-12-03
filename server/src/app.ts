import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import pacientesRouter from "./routes/pacientes";
import citasRouter from "./routes/citas";
import emailRouter from "./routes/email";

dotenv.config();

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const defaultProfesional = process.env.DEFAULT_PROFESIONAL || "";

app.use(
  cors({
    origin: clientOrigin,
  })
);
app.use(express.json());

// Servir archivos estáticos (logos, imágenes, etc.)
app.use("/public", express.static(path.join(__dirname, "../public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Config pública para el cliente
app.get("/api/config", (_req, res) => {
  res.json({ defaultProfesional });
});

app.use("/api/pacientes", pacientesRouter);
app.use("/api/citas", citasRouter);
app.use("/api/email", emailRouter);

export default app;
