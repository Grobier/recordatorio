import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import pacientesRouter from "./routes/pacientes";
import citasRouter from "./routes/citas";
import emailRouter from "./routes/email";

dotenv.config();

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const defaultProfesional = process.env.DEFAULT_PROFESIONAL || "";

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser requests
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn("[CORS] Origin no permitido:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
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
