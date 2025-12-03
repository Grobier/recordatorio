import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mailDefaults, transporter } from "../lib/mailer";
import {
  buildCitacionEmail,
  buildComprobanteEmail,
  logoAttachment,
} from "../email/templates";
import { EstadoCita } from "../types";

const router = Router();

const sendForCitas = async ({
  citaIds,
  tipo,
}: {
  citaIds: number[];
  tipo: "CITACION" | "COMPROBANTE";
}) => {
  console.log(`[EMAIL] Iniciando envío de ${tipo} para ${citaIds.length} citas:`, citaIds);
  
  const resultados: {
    citaId: number;
    pacienteId?: number;
    status: "OK" | "ERROR";
    message?: string;
  }[] = [];

  for (const citaId of citaIds) {
    let pacienteId: number | undefined;
    try {
      console.log(`[EMAIL] Procesando cita ${citaId}...`);
      
      const cita = await prisma.cita.findUnique({
        where: { id: citaId },
        include: { paciente: true },
      });

      console.log(`[EMAIL] Cita ${citaId} encontrada:`, cita ? "SÍ" : "NO");

      if (!cita || !cita.paciente) {
        console.log(`[EMAIL] ERROR: Cita ${citaId} o paciente no encontrado`);
        resultados.push({
          citaId,
          status: "ERROR",
          message: "Cita o paciente no encontrado",
        });
        continue;
      }

      pacienteId = cita.pacienteId;
      console.log(`[EMAIL] Paciente ID: ${pacienteId}, Correo: ${cita.paciente.correo || "NO TIENE"}`);

      if (!cita.paciente.correo) {
        console.log(`[EMAIL] ERROR: Paciente ${pacienteId} no tiene correo`);
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

      console.log(`[EMAIL] Construyendo contenido del correo para cita ${citaId}...`);
      
      const content =
        tipo === "CITACION"
          ? buildCitacionEmail(emailData)
          : buildComprobanteEmail(emailData);

      const attachments = [...logoAttachment];

      // Preparar el correo (siempre con html + texto de confirmacion)
      const mailOptions: any = {
        ...mailDefaults,
        to: cita.paciente.correo,
        subject: content.subject,
        html: content.html,
        text: content.text,
        attachments,
      };

      console.log(`[EMAIL] Preparando envío a ${cita.paciente.correo}...`);
      console.log(`[EMAIL] Asunto: ${content.subject}`);
      console.log(`[EMAIL] Desde: ${mailDefaults.from}`);
      console.log(`[EMAIL] Adjuntos: ${attachments.length}`);
      
      const startTime = Date.now();
      await transporter.sendMail(mailOptions);
      const duration = Date.now() - startTime;
      console.log(`[EMAIL] ✓ Correo enviado exitosamente para cita ${citaId} (${duration}ms)`);

      console.log(`[EMAIL] Guardando registro de envío en BD para cita ${citaId}...`);
      await prisma.registroEnvioCorreo.create({
        data: {
          tipoEnvio: tipo,
          citaId: cita.id,
          pacienteId: cita.pacienteId,
          resultado: "OK",
        },
      });
      console.log(`[EMAIL] Registro guardado exitosamente para cita ${citaId}`);

      resultados.push({
        citaId,
        pacienteId: cita.pacienteId,
        status: "OK",
      });
    } catch (error: any) {
      console.error(`[EMAIL] ✗ ERROR enviando correo para cita ${citaId}:`, error);
      console.error(`[EMAIL] Tipo de error:`, error?.constructor?.name);
      console.error(`[EMAIL] Mensaje de error:`, error?.message);
      console.error(`[EMAIL] Stack:`, error?.stack);
      
      // Intentar guardar el error en la BD, pero no fallar si no se puede
      try {
        if (pacienteId) {
          await prisma.registroEnvioCorreo.create({
            data: {
              tipoEnvio: tipo,
              citaId,
              pacienteId,
              resultado: "ERROR",
              mensajeError: error.message || String(error),
            },
          });
        }
      } catch (dbError) {
        console.error("Error guardando registro de error en BD:", dbError);
      }

      const errorMessage = error.message || String(error) || "Error desconocido";
      
      resultados.push({
        citaId,
        pacienteId,
        status: "ERROR",
        message: errorMessage,
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
    console.log(`[API] CitaIds extraídas:`, citaIds);

    if (!Array.isArray(citaIds) || citaIds.length === 0) {
      console.log(`[API] ERROR: Lista de citas inválida o vacía`);
      return res
        .status(400)
        .json({ success: false, message: "Debe enviar lista de citas" });
    }

    console.log(`[API] Iniciando proceso de envío de citaciones...`);
    const resultados = await sendForCitas({ citaIds, tipo: "CITACION" });
    console.log(`[API] Proceso completado, enviando respuesta...`);
    res.json({ success: true, resultados });
    console.log(`[API] Respuesta enviada exitosamente`);
  } catch (error: any) {
    console.error("[API] ✗ ERROR en ruta /citacion:", error);
    console.error("[API] Stack trace:", error?.stack);
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
    console.log(`[API] CitaIds extraídas:`, citaIds);

    if (!Array.isArray(citaIds) || citaIds.length === 0) {
      console.log(`[API] ERROR: Lista de citas inválida o vacía`);
      return res
        .status(400)
        .json({ success: false, message: "Debe enviar lista de citas" });
    }

    console.log(`[API] Buscando citas en BD...`);
    const citas = await prisma.cita.findMany({
      where: { id: { in: citaIds } },
    });
    console.log(`[API] Citas encontradas: ${citas.length}`);

    const noAsistidas = citas
      .filter((c) => c.estado !== ("ASISTIDA" as EstadoCita))
      .map((c) => c.id);

    const asistidasIds = citas
      .filter((c) => c.estado === ("ASISTIDA" as EstadoCita))
      .map((c) => c.id);

    console.log(`[API] Citas no asistidas: ${noAsistidas.length}`, noAsistidas);
    console.log(`[API] Citas asistidas: ${asistidasIds.length}`, asistidasIds);

    const resultadosPrevios = noAsistidas.map((id) => ({
      citaId: id,
      status: "ERROR" as const,
      message: "La cita no esta marcada como ASISTIDA",
    }));

    const resultadosEnvio =
      asistidasIds.length > 0
        ? await sendForCitas({ citaIds: asistidasIds, tipo: "COMPROBANTE" })
        : [];

    console.log(`[API] Enviando respuesta con ${resultadosEnvio.length} resultados de envío`);
    res.json({
      success: true,
      noAsistidas,
      resultados: [...resultadosPrevios, ...resultadosEnvio],
    });
    console.log(`[API] Respuesta enviada exitosamente`);
  } catch (error: any) {
    console.error("[API] ✗ ERROR en ruta /comprobante:", error);
    console.error("[API] Stack trace:", error?.stack);
    res.status(500).json({
      success: false,
      message: "Error al enviar comprobantes",
      error: error?.message || String(error) || "Error desconocido",
    });
  }
});

export default router;
