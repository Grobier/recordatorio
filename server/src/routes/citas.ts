import { Router } from "express";
import { prisma } from "../lib/prisma";
import { EstadoCita } from "../types";

const router = Router();

// Parse yyyy-mm-dd as local date to avoid UTC shifts
const parseLocalDate = (value: any): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parts = value.split("-").map(Number);
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
      const [y, m, d] = parts;
      return new Date(y, m - 1, d, 12, 0, 0); // mediodía local
    }
  }
  return undefined;
};

router.get("/", async (req, res) => {
  try {
    console.log("[API] GET /api/citas recibido");
    const { pacienteId, estado, fecha } = req.query;

    const filters: any = {};

    if (pacienteId) {
      filters.pacienteId = Number(pacienteId);
    }

    if (estado) {
      filters.estado = estado as EstadoCita;
    }

    if (fecha) {
      const date = parseLocalDate(fecha);
      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        filters.fechaSesion = { gte: start, lte: end };
      }
    }

    const citas = await prisma.cita.findMany({
      where: filters,
      include: { paciente: true },
      orderBy: { fechaSesion: "desc" },
    });
    console.log(`[API] Enviando ${citas.length} citas`);
    res.json(citas);
  } catch (error: any) {
    console.error("[API] Error en GET /api/citas:", error);
    console.error("[API] Stack:", error?.stack);
    res.status(500).json({
      success: false,
      message: "Error al obtener citas",
      error: error?.message || String(error),
    });
  }
});

router.post("/", async (req, res) => {
  const {
    pacienteId,
    fechaSesion,
    horaSesion,
    lugar,
    profesional,
    tipoPrestacion,
    estado,
  } = req.body;

  if (!pacienteId || !fechaSesion || !horaSesion) {
    return res.status(400).json({
      success: false,
      message: "Paciente, fecha y hora son obligatorios",
    });
  }

  try {
    const fechaLocal = parseLocalDate(fechaSesion) || new Date(fechaSesion);
    const cita = await prisma.cita.create({
      data: {
        pacienteId: Number(pacienteId),
        fechaSesion: fechaLocal,
        horaSesion,
        lugar,
        profesional,
        tipoPrestacion,
        estado: (estado as EstadoCita) || "PROGRAMADA",
      },
      include: { paciente: true },
    });
    res.status(201).json({ success: true, data: cita });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al crear cita",
      error: error.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const {
    pacienteId,
    fechaSesion,
    horaSesion,
    lugar,
    profesional,
    tipoPrestacion,
    estado,
  } = req.body;

  try {
    const fechaLocal =
      parseLocalDate(fechaSesion) || (fechaSesion ? new Date(fechaSesion) : undefined);

    const cita = await prisma.cita.update({
      where: { id },
      data: {
        pacienteId: pacienteId ? Number(pacienteId) : undefined,
        fechaSesion: fechaLocal,
        horaSesion,
        lugar,
        profesional,
        tipoPrestacion,
        estado: estado as EstadoCita,
      },
      include: { paciente: true },
    });
    res.json({ success: true, data: cita });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar cita",
      error: error.message,
    });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.registroEnvioCorreo.deleteMany({ where: { citaId: id } });
    await prisma.cita.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar cita",
      error: error.message,
    });
  }
});

router.get("/historial/envios", async (_req, res) => {
  try {
    console.log("[API] GET /api/citas/historial/envios recibido");
    const envios = await prisma.registroEnvioCorreo.findMany({
      include: {
        paciente: true,
        cita: true,
      },
      orderBy: { fechaEnvio: "desc" },
      take: 50,
    });
    console.log(`[API] Enviando ${envios.length} registros de envio`);
    res.json(envios);
  } catch (error: any) {
    console.error("[API] Error en GET /api/citas/historial/envios:", error);
    console.error("[API] Stack:", error?.stack);
    res.status(500).json({
      success: false,
      message: "Error al obtener historial",
      error: error?.message || String(error),
    });
  }
});

// Funciones helper para confirmar y cancelar
const handleConfirmar = async (id: number, res: any) => {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id },
      include: { paciente: true },
    });

    if (!cita) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada",
      });
    }

    await prisma.cita.update({
      where: { id },
      data: { estado: "ASISTIDA" as EstadoCita },
    });

    // Redirigir a una pagina de confirmacion (o retornar JSON)
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Confirmacion recibida</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #4caf50; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Confirmacion recibida</h1>
            <p>Has confirmado tu asistencia para la cita del ${new Date(cita.fechaSesion).toLocaleDateString('es-CL')} a las ${cita.horaSesion}.</p>
            <p>Te esperamos en ${cita.lugar}.</p>
            <p style="margin-top: 30px; font-size: 14px; color: #999;">Puedes cerrar esta ventana.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al confirmar asistencia",
      error: error.message,
    });
  }
};

const handleCancelar = async (id: number, res: any) => {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id },
      include: { paciente: true },
    });

    if (!cita) {
      return res.status(404).json({
        success: false,
        message: "Cita no encontrada",
      });
    }

    await prisma.cita.update({
      where: { id },
      data: { estado: "AUSENTE" as EstadoCita },
    });

    // Redirigir a una pagina de confirmacion
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Cancelacion recibida</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 500px;
            }
            h1 { color: #f44336; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Cancelacion recibida</h1>
            <p>Has cancelado tu asistencia para la cita del ${new Date(cita.fechaSesion).toLocaleDateString('es-CL')} a las ${cita.horaSesion}.</p>
            <p>Si necesitas reagendar, por favor contactanos.</p>
            <p style="margin-top: 30px; font-size: 14px; color: #999;">Puedes cerrar esta ventana.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al cancelar asistencia",
      error: error.message,
    });
  }
};

// Endpoint para confirmar asistencia (POST y GET)
router.post("/:id/confirmar", async (req, res) => {
  await handleConfirmar(Number(req.params.id), res);
});

router.get("/:id/confirmar", async (req, res) => {
  await handleConfirmar(Number(req.params.id), res);
});

// Endpoint para cancelar asistencia (POST y GET)
router.post("/:id/cancelar", async (req, res) => {
  await handleCancelar(Number(req.params.id), res);
});

router.get("/:id/cancelar", async (req, res) => {
  await handleCancelar(Number(req.params.id), res);
});

export default router;
