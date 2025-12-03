import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    console.log("[API] GET /api/pacientes recibido");
    const pacientes = await prisma.paciente.findMany({
      orderBy: { nombreCompleto: "asc" },
    });
    console.log(`[API] Enviando ${pacientes.length} pacientes`);
    res.json(pacientes);
  } catch (error: any) {
    console.error("[API] Error en GET /api/pacientes:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener pacientes",
      error: error?.message || String(error),
    });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("[API] POST /api/pacientes recibido");
    const { nombreCompleto, rut, correo, telefono, observaciones } = req.body;

    if (!nombreCompleto || !correo) {
      console.log("[API] ERROR: Faltan campos obligatorios");
      return res
        .status(400)
        .json({ success: false, message: "Nombre y correo son obligatorios" });
    }

    const nuevo = await prisma.paciente.create({
      data: {
        nombreCompleto,
        rut: rut || null,
        correo,
        telefono: telefono || null,
        observaciones: observaciones || null,
      },
    });
    console.log(`[API] Paciente creado con ID: ${nuevo.id}`);
    res.status(201).json({ success: true, data: nuevo });
  } catch (error: any) {
    console.error("[API] Error en POST /api/pacientes:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      (error.meta as any)?.target?.includes("rut")
    ) {
      return res
        .status(409)
        .json({ success: false, message: "Ya existe un paciente con ese RUT" });
    }
    res.status(500).json({
      success: false,
      message: "Error al crear paciente",
      error: error?.message || String(error),
    });
  }
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { nombreCompleto, rut, correo, telefono, observaciones } = req.body;

  try {
    const actualizado = await prisma.paciente.update({
      where: { id },
      data: {
        nombreCompleto,
        rut: rut || null,
        correo,
        telefono: telefono || null,
        observaciones: observaciones || null,
      },
    });
    res.json({ success: true, data: actualizado });
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      (error.meta as any)?.target?.includes("rut")
    ) {
      return res
        .status(409)
        .json({ success: false, message: "Ya existe un paciente con ese RUT" });
    }
    res.status(500).json({
      success: false,
      message: "Error al actualizar paciente",
      error: error?.message || String(error),
    });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.registroEnvioCorreo.deleteMany({ where: { pacienteId: id } });
    await prisma.cita.deleteMany({ where: { pacienteId: id } });
    await prisma.paciente.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar paciente",
      error: error?.message || String(error),
    });
  }
});

export default router;
