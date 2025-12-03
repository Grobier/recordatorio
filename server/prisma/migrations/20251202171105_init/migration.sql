-- CreateTable
CREATE TABLE "Paciente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombreCompleto" TEXT NOT NULL,
    "rut" TEXT,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "observaciones" TEXT
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pacienteId" INTEGER NOT NULL,
    "fechaSesion" DATETIME NOT NULL,
    "horaSesion" TEXT NOT NULL,
    "lugar" TEXT NOT NULL,
    "profesional" TEXT NOT NULL,
    "tipoPrestacion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PROGRAMADA',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroEnvioCorreo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipoEnvio" TEXT NOT NULL DEFAULT 'CITACION',
    "citaId" INTEGER NOT NULL,
    "pacienteId" INTEGER NOT NULL,
    "fechaEnvio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultado" TEXT NOT NULL DEFAULT 'OK',
    "mensajeError" TEXT,
    CONSTRAINT "RegistroEnvioCorreo_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RegistroEnvioCorreo_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_rut_key" ON "Paciente"("rut");
