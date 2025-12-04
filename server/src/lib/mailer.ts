import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  MAIL_FROM,
} = process.env;

// Fail fast if SMTP is unreachable so the API does not hang for minutes
// Aumentado a 30 segundos para dar más tiempo en conexiones lentas
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS) || 30000;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
  console.warn(
    "SMTP env vars missing. Emails will fail until .env is configured."
  );
}

console.log("[MAILER] Configurando transporter SMTP...");
console.log("[MAILER] SMTP_HOST:", SMTP_HOST || "NO CONFIGURADO");
console.log("[MAILER] SMTP_PORT:", SMTP_PORT || "NO CONFIGURADO");
console.log("[MAILER] SMTP_USER:", SMTP_USER || "NO CONFIGURADO");
console.log("[MAILER] SMTP_SECURE:", SMTP_SECURE === "true");
console.log("[MAILER] SMTP_TIMEOUT_MS:", SMTP_TIMEOUT_MS);
console.log("[MAILER] MAIL_FROM:", MAIL_FROM || "NO CONFIGURADO");

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: SMTP_SECURE === "true",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  connectionTimeout: SMTP_TIMEOUT_MS,
  greetingTimeout: SMTP_TIMEOUT_MS,
  socketTimeout: SMTP_TIMEOUT_MS,
  pool: false,
  maxConnections: 1,
  maxMessages: 1,
  // Agregar opciones adicionales para mejorar la conexión
  tls: {
    rejectUnauthorized: false, // Permitir certificados autofirmados (útil para desarrollo)
  },
  debug: process.env.SMTP_DEBUG === "true", // Activar debug si es necesario
});

// Event listeners for debugging
transporter.on("token", (token: unknown) => {
  console.log("[MAILER] Token recibido:", token);
});

transporter.on("idle", () => {
  console.log("[MAILER] Transporter en estado idle");
});

transporter.on("error", (error: Error) => {
  console.error("[MAILER] Error en transporter:", error);
  console.error("[MAILER] Código de error:", (error as any).code);
  console.error("[MAILER] Comando que falló:", (error as any).command);
});

transporter.on("connect", () => {
  console.log("[MAILER] Conectado exitosamente al servidor SMTP");
});

transporter.on("end", () => {
  console.log("[MAILER] Conexión SMTP cerrada");
});

export const mailDefaults = {
  from: MAIL_FROM,
};

// Validate SMTP credentials early to surface misconfiguration quickly.
// Allow skipping via env to avoid failing boot when SMTP is blocked.
if (process.env.SKIP_SMTP_VERIFY !== "true") {
  console.log("[MAILER] Verificando conexion SMTP...");
  transporter
    .verify()
    .then(() => {
      console.log("[MAILER] SMTP verificado y listo para enviar correos");
    })
    .catch((err: Error) => {
      console.error(
        "[MAILER] No se pudo verificar SMTP. Revise variables .env o habilite SKIP_SMTP_VERIFY=true"
      );
      console.error("[MAILER] Error detalles:", err.message);
      console.error("[MAILER] Stack:", err.stack);
    });
} else {
  console.log("[MAILER] SKIP_SMTP_VERIFY=true, omitiendo verificacion inicial");
}
