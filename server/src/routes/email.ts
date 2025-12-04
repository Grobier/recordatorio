import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mailDefaults, sendEmail } from "../lib/mailer";
import {
  buildCitacionEmail,
  buildComprobanteEmail,
  logoAttachment,
} from "../email/templates";
import { EstadoCita } from "../types";

const router = Router();

type ResultadoEnvio = {
  citaId: number;
  pacienteId?: number;
  status: "OK" | "ERROR";
  message?: string;
};

const sendForCitas = async ({
  citaIds,
  tipo,
}: {
  citaIds: number[];
  tipo: "CITACION" | "COMPROBANTE";
}) => {
  console.log(
    `[EMAIL] Iniciando envio de ${tipo} para ${citaIds.length} citas:`,
    citaIds
  );

  const resultados: ResultadoEnvio[] = [];

  for (const citaId of citaIds) {
    let pacienteId: number | undefined;
    try {
      const cita = await prisma.cita.findUnique({
        where: { id: citaId },
        include: { paciente: true },
      });

      if (!cita || !cita.paciente) {
        resultados.push({
          citaId,
          status: "ERROR",
          message: "Cita o paciente no encontrado",
        });
        continue;
      }

      pacienteId = cita.pacienteId;

      if (!cita.paciente.correo) {
        resultados.push({
          citaId,
          pacienteId: cita.pacienteId,
          status: "ERROR",
          message: "Paciente sin correo",
        });
        continue;
      }

      const profesional =
        cita.profesional || process.env.DEFAULT_PROFESIONAL || "Kinesiologo/a";

      const baseUrl =
        process.env.BASE_URL ||
        process.env.CLIENT_ORIGIN ||
        "http://localhost:4000";

      const emailData = {
        citaId: cita.id,
        nombrePaciente: cita.paciente.nombreCompleto,
        fechaSesion: new Date(cita.fechaSesion),
        horaSesion: cita.horaSesion,
        lugar: cita.lugar,
        profesional,
        tipoPrestacion: cita.tipoPrestacion,
        baseUrl,
      };

      const content =
        tipo === "CITACION"
          ? buildCitacionEmail(emailData)
          : buildComprobanteEmail(emailData);

      const attachments = [...logoAttachment];

      const startTime = Date.now();
      const emailResult = await sendEmail({
        to: cita.paciente.correo,
        subject: content.subject,
        html: content.html,
        text: content.text,
        attachments,
        from: mailDefaults.from,
      });
      const duration = Date.now() - startTime;
      console.log(`[EMAIL] Correo enviado para cita ${citaId} (${duration}ms)`);
      console.log(`[EMAIL] Resultado Resend:`, emailResult);

      await prisma.registroEnvioCorreo.create({
        data: {
          tipoEnvio: tipo,
          citaId: cita.id,
          pacienteId: cita.pacienteId,
          resultado: "OK",
        },
      });

      resultados.push({ citaId, pacienteId: cita.pacienteId, status: "OK" });
    } catch (error: any) {
      console.error(`[EMAIL] ERROR enviando correo para cita ${citaId}:`, error);
      console.error(`[EMAIL] Código de error:`, error?.code);
      console.error(`[EMAIL] Comando que falló:`, error?.command);
      console.error(`[EMAIL] Stack trace:`, error?.stack);

      // Información adicional para diagnóstico
      if (error?.code === "ETIMEDOUT") {
        console.error(`[EMAIL] TIMEOUT: El servidor SMTP no respondió en ${process.env.SMTP_TIMEOUT_MS || 30000}ms`);
        console.error(`[EMAIL] Verifica que el servidor SMTP sea accesible desde Render`);
        console.error(`[EMAIL] SMTP_HOST configurado: ${process.env.SMTP_HOST || "NO CONFIGURADO"}`);
        console.error(`[EMAIL] SMTP_PORT configurado: ${process.env.SMTP_PORT || "NO CONFIGURADO"}`);
      }

      try {
        if (pacienteId) {
          await prisma.registroEnvioCorreo.create({
            data: {
              tipoEnvio: tipo,
              citaId,
              pacienteId,
              resultado: "ERROR",
              mensajeError: error?.message || String(error),
            },
          });
        }
      } catch (dbError) {
        console.error("Error guardando registro de error en BD:", dbError);
      }

      resultados.push({
        citaId,
        pacienteId,
        status: "ERROR",
        message: error?.message || String(error) || "Error desconocido",
      });
    }
  }

  console.log(`[EMAIL] Proceso completado. Resultados:`, resultados);
  return resultados;
};

router.post("/citacion", async (req, res) => {
  console.log(`[API] POST /email/citacion recibido`);
  console.log(`[API] Body recibido:`, JSON.stringify(req.body));

  try {
    const { citaIds } = req.body as { citaIds: number[] };

    if (!Array.isArray(citaIds) || citaIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Debe enviar lista de citas" });
    }

    const resultados = await sendForCitas({ citaIds, tipo: "CITACION" });
    const ok = resultados.filter((r) => r.status === "OK").length;
    const errors = resultados.filter((r) => r.status === "ERROR").length;
    const hasError = errors > 0;

    const payload = { success: !hasError, resultados, ok, errors };
    if (hasError) {
      return res.status(502).json(payload);
    }

    res.json(payload);
  } catch (error: any) {
    console.error("[API] ERROR en ruta /citacion:", error);
    res.status(500).json({
      success: false,
      message: "Error al enviar citaciones",
      error: error?.message || String(error) || "Error desconocido",
    });
  }
});

router.post("/comprobante", async (req, res) => {
  console.log(`[API] POST /email/comprobante recibido`);
  console.log(`[API] Body recibido:`, JSON.stringify(req.body));

  try {
    const { citaIds } = req.body as { citaIds: number[] };

    if (!Array.isArray(citaIds) || citaIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Debe enviar lista de citas" });
    }

    const citas = await prisma.cita.findMany({
      where: { id: { in: citaIds } },
    });

    const noAsistidas = citas
      .filter((c) => c.estado !== ("ASISTIDA" as EstadoCita))
      .map((c) => c.id);

    const asistidasIds = citas
      .filter((c) => c.estado === ("ASISTIDA" as EstadoCita))
      .map((c) => c.id);

    const resultadosPrevios = noAsistidas.map((id) => ({
      citaId: id,
      status: "ERROR" as const,
      message: "La cita no esta marcada como ASISTIDA",
    }));

    const resultadosEnvio =
      asistidasIds.length > 0
        ? await sendForCitas({ citaIds: asistidasIds, tipo: "COMPROBANTE" })
        : [];

    const resultados = [...resultadosPrevios, ...resultadosEnvio];
    const ok = resultados.filter((r) => r.status === "OK").length;
    const errors = resultados.filter((r) => r.status === "ERROR").length;
    const hasError = errors > 0;

    const payload = {
      success: !hasError,
      noAsistidas,
      resultados,
      ok,
      errors,
    };

    if (hasError) {
      return res.status(502).json(payload);
    }

    res.json(payload);
  } catch (error: any) {
    console.error("[API] ERROR en ruta /comprobante:", error);
    res.status(500).json({
      success: false,
      message: "Error al enviar comprobantes",
      error: error?.message || String(error) || "Error desconocido",
    });
  }
});

export default router;
