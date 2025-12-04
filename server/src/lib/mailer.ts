import nodemailer from "nodemailer";
import { Resend } from "resend";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Soporte para Resend (recomendado) o SMTP (fallback)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  MAIL_FROM,
} = process.env;

// Determinar qué método usar: Resend (preferido) o SMTP
const USE_RESEND = !!RESEND_API_KEY;

// Inicializar Resend si está configurado
export const resend = USE_RESEND ? new Resend(RESEND_API_KEY) : null;

if (USE_RESEND) {
  console.log("[MAILER] Usando Resend para envío de correos");
  console.log("[MAILER] RESEND_API_KEY:", RESEND_API_KEY ? "CONFIGURADO" : "NO CONFIGURADO");
  if (!MAIL_FROM) {
    console.warn("[MAILER] MAIL_FROM no configurado. Resend usará el dominio verificado por defecto.");
  }
} else {
  console.log("[MAILER] Usando SMTP para envío de correos");
  console.log("[MAILER] SMTP_HOST:", SMTP_HOST || "NO CONFIGURADO");
  console.log("[MAILER] SMTP_PORT:", SMTP_PORT || "NO CONFIGURADO");
  console.log("[MAILER] SMTP_USER:", SMTP_USER || "NO CONFIGURADO");
  console.log("[MAILER] SMTP_SECURE:", SMTP_SECURE === "true");
  console.log("[MAILER] MAIL_FROM:", MAIL_FROM || "NO CONFIGURADO");
  
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
    console.warn(
      "[MAILER] SMTP env vars missing. Emails will fail until .env is configured."
    );
  }
}

// Configuración SMTP (solo si no se usa Resend)
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS) || 30000;

export const transporter = USE_RESEND
  ? null // No se usa transporter con Resend
  : nodemailer.createTransport({
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
      tls: {
        rejectUnauthorized: false,
      },
      debug: process.env.SMTP_DEBUG === "true",
    });

// Event listeners para debugging (solo SMTP)
if (transporter) {
  transporter.on("error", (error: Error) => {
    console.error("[MAILER] Error en transporter:", error);
    console.error("[MAILER] Código de error:", (error as any).code);
    console.error("[MAILER] Comando que falló:", (error as any).command);
  });

  transporter.on("connect", () => {
    console.log("[MAILER] Conectado exitosamente al servidor SMTP");
  });
}

export const mailDefaults = {
  from: MAIL_FROM,
};

// Validar conexión solo para SMTP (Resend se valida al enviar)
if (!USE_RESEND && transporter && process.env.SKIP_SMTP_VERIFY !== "true") {
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
} else if (USE_RESEND) {
  console.log("[MAILER] Resend configurado. La verificación se hará al enviar el primer correo.");
}

// Función helper para enviar correos (compatible con ambos métodos)
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; path?: string; content?: Buffer; contentType?: string }>;
  from?: string;
}) {
  if (USE_RESEND && resend) {
    // Usar Resend
    const fromEmail = options.from || MAIL_FROM || "onboarding@resend.dev";
    
    const resendOptions: any = {
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    if (options.text) {
      resendOptions.text = options.text;
    }

    // Convertir attachments de nodemailer a formato Resend
    if (options.attachments && options.attachments.length > 0) {
      resendOptions.attachments = await Promise.all(
        options.attachments.map(async (att) => {
          let content: Buffer | undefined;
          
          if (att.content) {
            content = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content);
          } else if (att.path) {
            try {
              const fullPath = path.isAbsolute(att.path) 
                ? att.path 
                : path.join(process.cwd(), att.path);
              content = fs.readFileSync(fullPath);
            } catch (error) {
              console.warn(`[MAILER] No se pudo leer attachment ${att.path}:`, error);
              return null;
            }
          }
          
          if (!content) return null;
          
          return {
            filename: att.filename || "attachment",
            content: content,
          };
        })
      );
      // Filtrar nulls
      resendOptions.attachments = resendOptions.attachments.filter((att) => att !== null);
    }

    const result = await resend.emails.send(resendOptions);
    return result;
  } else if (transporter) {
    // Usar SMTP tradicional
    const mailOptions: any = {
      from: options.from || mailDefaults.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    if (options.text) {
      mailOptions.text = options.text;
    }

    if (options.attachments) {
      mailOptions.attachments = options.attachments;
    }

    return await transporter.sendMail(mailOptions);
  } else {
    throw new Error("No hay método de envío configurado. Configure RESEND_API_KEY o variables SMTP.");
  }
}
