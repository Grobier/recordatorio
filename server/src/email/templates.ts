import fs from "fs";
import path from "path";
import { ComprobanteEmailData, CitacionEmailData } from "../types";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

// Locate logo on disk; fallback to text if not found
const findLogoPath = (): string | null => {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "fisiomove.png"), // server/
    path.join(cwd, "server", "public", "fisiomove.png"), // repo root
    path.join(__dirname, "../../public/fisiomove.png"), // dist build
    path.join(__dirname, "../../../public/fisiomove.png"), // ts-node-dev
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

export const logoCid = "kine-logo";
export const logoAttachment = (() => {
  const logoPath = findLogoPath();
  if (!logoPath) return [];
  return [
    {
      filename: "logo.png",
      path: logoPath,
      cid: logoCid,
    },
  ];
})();

const getEmailShell = (content: string) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Citas Kinesiologia</title>
</head>
<body style="margin:0;padding:0;font-family: 'Segoe UI', Arial, sans-serif;background:#f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fa;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const renderHeader = () => `
  <tr>
    <td style="padding:18px 20px;text-align:center;background:linear-gradient(120deg,#0b1220 0%,#0b1220 55%,#1d3557 100%);">
      ${
        logoAttachment.length > 0
          ? `<img src="cid:${logoCid}" alt="FisioMove" width="150" style="max-width:150px;height:auto;display:block;margin:0 auto;border:0;" />`
          : `<span style="color:#e5e7eb;font-size:20px;font-weight:700;">FisioMove</span>`
      }
    </td>
  </tr>
`;

export const buildCitacionEmail = (
  data: CitacionEmailData
): { subject: string; html: string; text: string } => {
  const fecha = formatDate(data.fechaSesion);
  const subject = `Citacion a sesion de kinesiologia - ${fecha}`;
  const confirmUrl = `${data.baseUrl || "http://localhost:4000"}/api/citas/${data.citaId}/confirmar`;
  const cancelUrl = `${data.baseUrl || "http://localhost:4000"}/api/citas/${data.citaId}/cancelar`;

  const html = getEmailShell(`
    ${renderHeader()}
    <tr>
      <td style="padding:20px 24px 8px 24px;text-align:center;">
        <h2 style="margin:0;color:#1f2937;font-size:22px;">Citacion a sesion</h2>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 20px 24px;color:#374151;font-size:15px;line-height:1.7;">
        <p style="margin:0 0 12px 0;">Estimado/a <strong>${data.nombrePaciente}</strong>,</p>
        <p style="margin:0 0 12px 0;">Te recordamos tu citacion a sesion de kinesiologia el dia <strong>${fecha}</strong> a las <strong>${data.horaSesion}</strong>, en <strong>${data.lugar}</strong>, con el profesional <strong>${data.profesional}</strong>.</p>
        <p style="margin:0 0 12px 0;">Por favor llega 10 minutos antes de la hora indicada. Si cuentas con examenes o informes, traelos a la sesion.</p>
        <p style="margin:0 0 12px 0;">Ante cualquier duda, puedes responder a este mismo correo.</p>
        <p style="margin:0;">Atentamente,<br/>FISIOMOVE</p>
        <p style="margin:12px 0 0 0; color:#6b7280; font-size:13px;">
          Nota: Puedes verificar la validez del profesional con RUT 18.286.120-0 en la Superintendencia de Salud.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 24px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="width:50%;padding-right:8px;">
              <a href="${cancelUrl}" style="display:block;text-decoration:none;background:#ef4444;color:#fff;padding:14px;border-radius:10px;text-align:center;font-weight:700;">No voy a asistir</a>
            </td>
            <td style="width:50%;padding-left:8px;">
              <a href="${confirmUrl}" style="display:block;text-decoration:none;background:#22c55e;color:#fff;padding:14px;border-radius:10px;text-align:center;font-weight:700;">Confirmar asistencia</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);

  const text = `Estimado/a ${data.nombrePaciente},
Te recordamos tu citacion a sesion de kinesiologia el dia ${fecha} a las ${data.horaSesion}, en ${data.lugar}, con el profesional ${data.profesional}.
Por favor llega 10 minutos antes de la hora indicada. Si cuentas con examenes o informes, traelos a la sesion.
Ante cualquier duda, puedes responder a este mismo correo.
Confirmar asistencia: ${confirmUrl}
No voy a asistir: ${cancelUrl}
Atentamente,
FISIOMOVE
Nota: Puedes verificar la validez del profesional con RUT 18.286.120-0 en la Superintendencia de Salud.`;

  return { subject, html, text };
};

export const buildComprobanteEmail = (
  data: ComprobanteEmailData
): { subject: string; html: string; text: string } => {
  const fecha = formatDate(data.fechaSesion);
  const subject = `Certificado de asistencia - ${fecha}`;

  const cuerpoHtml = `
    <p style="margin:0 0 12px 0;">
      Por medio del presente, se certifica que <strong>${data.nombrePaciente}</strong> asistio el dia <strong>${fecha}</strong> a nuestro servicio de Kinesiologia, para continuar su tratamiento.
    </p>
    <p style="margin:0 0 12px 0;">
      Se extiende el presente certificado para ser presentado en su lugar de trabajo.
    </p>
  `;

  const html = getEmailShell(`
    ${renderHeader()}
    <tr>
      <td style="padding:20px 24px 8px 24px;text-align:center;">
        <h2 style="margin:0;color:#1f2937;font-size:22px;">Certificado de asistencia</h2>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 20px 24px;color:#374151;font-size:15px;line-height:1.7;">
        <p style="margin:0 0 12px 0;">Estimado/a <strong>${data.nombrePaciente}</strong>,</p>
        ${cuerpoHtml}
        <p style="margin:0 0 12px 0;">Profesional: <strong>${data.profesional}</strong>.</p>
        <p style="margin:0 0 12px 0;">Muchas gracias por confiar en nuestro servicio.</p>
        <p style="margin:0;">Atentamente,<br/>FISIOMOVE</p>
        <p style="margin:12px 0 0 0; color:#6b7280; font-size:13px;">
          Nota: Puedes verificar la validez del profesional con RUT 18.286.120-0 en la Superintendencia de Salud.
        </p>
      </td>
    </tr>
  `);

  const text = `Estimado/a ${data.nombrePaciente},
Por medio del presente, se certifica que ${data.nombrePaciente} asistio el dia ${fecha} a nuestro servicio de Kinesiologia, para continuar su tratamiento.
Se extiende el presente certificado para ser presentado en su lugar de trabajo.
Profesional: ${data.profesional}.
Muchas gracias por confiar en nuestro servicio.
Atentamente,
FISIOMOVE
Nota: Puedes verificar la validez del profesional con RUT 18.286.120-0 en la Superintendencia de Salud.`;

  return { subject, html, text };
};
