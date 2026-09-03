/**
 * Correos transaccionales vía Resend.
 *
 * Configuración (.env.local / producción):
 *   RESEND_API_KEY        — API key generada en https://resend.com/api-keys
 *   RESEND_FROM_EMAIL     — Remitente verificado, ej. "MotoClick <noreply@motoclick.mx>"
 *   RESEND_NOTIFY_EMAIL   — Bandeja interna que recibe la notificación de compra
 *   RESEND_BCC_EMAIL      — (opcional) bcc de auditoría
 *
 * Sin RESEND_API_KEY las funciones se vuelven no-op (loguean y retornan).
 */
import { Resend } from 'resend';
import { site } from '@/lib/site';

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!cachedClient) cachedClient = new Resend(key);
  return cachedClient;
}

function getFrom(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    `${site.name} <onboarding@resend.dev>`
  );
}

function getNotifyEmail(): string {
  return process.env.RESEND_NOTIFY_EMAIL?.trim() || 'notificaciones@finva-app.com';
}

function getBcc(): string | undefined {
  return process.env.RESEND_BCC_EMAIL?.trim() || undefined;
}

function formatMxn(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type PurchaseEmailPayload = {
  paymentId: string;
  amount: number;
  installments?: number | null;
  paymentMethod?: string | null;
  motorcycleName?: string | null;
  motorcycleId?: string | null;
  buyerFullName: string;
  buyerEmail: string;
  buyerPhone: string;
  externalReference?: string | null;
  /** URL absoluta para WhatsApp prearmado del CTA del cliente. */
  whatsappUrl: string;
  whatsappDisplay: string;
};

/**
 * Botón con el mismo look del WhatsApp CTA del header (verde sólido, pill).
 * Inline-styled para clientes de correo que descartan <style>.
 */
function whatsappButtonHtml(href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td bgcolor="#37b24d" style="border-radius: 999px;">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block; padding: 14px 24px; background:#37b24d; color:#ffffff;
                    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    font-size: 15px; font-weight: 800; line-height: 1; text-decoration: none;
                    border-radius: 999px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function layoutWrap(innerHtml: string, preheader: string): string {
  return `<!doctype html>
<html lang="es-MX">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(site.name)}</title>
</head>
<body style="margin:0; padding:0; background:#f7f8f5; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#162016;">
  <span style="display:none !important; opacity:0; visibility:hidden; height:0; width:0; mso-hide:all;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f5; padding: 28px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border:1px solid #e4e9e0; border-radius: 22px; overflow:hidden;">
          <tr>
            <td style="padding: 22px 28px; background: linear-gradient(135deg, #0d1b12, #1a3322); color: #ffffff;">
              <div style="font-size: 22px; font-weight: 900; letter-spacing: -.03em;">
                ${escapeHtml(site.logoText)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 28px; background:#f7f8f5; color:#647064; font-size:12px; line-height:1.5;">
              Este correo fue enviado por ${escapeHtml(site.name)}. Si tienes dudas, escríbenos a
              <a href="https://wa.me/${escapeHtml(site.whatsapp)}" style="color:#218838; text-decoration:none;">${escapeHtml(site.whatsappDisplay)}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailsRows(payload: PurchaseEmailPayload): string {
  const items: Array<[string, string]> = [
    ['Moto', payload.motorcycleName ?? '—'],
    ['Total cobrado', formatMxn(payload.amount)],
    ['Mensualidades', payload.installments ? `${payload.installments}` : '1 (contado / débito)'],
    ['Método', payload.paymentMethod ?? '—'],
    ['ID de pago Mercado Pago', payload.paymentId],
    ['Referencia interna', payload.externalReference ?? '—'],
  ];
  return items
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 0; color:#647064; font-size:13px; width:42%;">${escapeHtml(k)}</td>
        <td style="padding:8px 0; color:#162016; font-size:14px; font-weight:600;">${escapeHtml(v)}</td>
      </tr>`
    )
    .join('');
}

function buyerRows(payload: PurchaseEmailPayload): string {
  const items: Array<[string, string]> = [
    ['Nombre', payload.buyerFullName],
    ['Email', payload.buyerEmail],
    ['Teléfono', payload.buyerPhone],
  ];
  return items
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 0; color:#647064; font-size:13px; width:42%;">${escapeHtml(k)}</td>
        <td style="padding:8px 0; color:#162016; font-size:14px; font-weight:600;">${escapeHtml(v)}</td>
      </tr>`
    )
    .join('');
}

export async function sendPurchaseInternalEmail(payload: PurchaseEmailPayload): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY no configurado; saltando correo interno.', {
      paymentId: payload.paymentId,
    });
    return;
  }
  const html = layoutWrap(
    `
      <h2 style="margin:0 0 6px; font-size:22px; letter-spacing:-.03em;">Nueva compra aprobada</h2>
      <p style="margin:0 0 18px; color:#647064; line-height:1.5;">
        Se procesó un pago con Mercado Pago. Revisa los datos del comprador y coordina la entrega.
      </p>
      <h3 style="margin: 18px 0 6px; font-size:15px; color:#218838;">Detalle del pago</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${detailsRows(payload)}
      </table>
      <h3 style="margin: 22px 0 6px; font-size:15px; color:#218838;">Comprador</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${buyerRows(payload)}
      </table>
    `,
    `Pago aprobado · ${payload.motorcycleName ?? payload.paymentId}`
  );
  try {
    await resend.emails.send({
      from: getFrom(),
      to: [getNotifyEmail()],
      bcc: getBcc() ? [getBcc()!] : undefined,
      subject: `[${site.name}] Compra aprobada · ${payload.motorcycleName ?? payload.paymentId}`,
      html,
      replyTo: payload.buyerEmail || undefined,
    });
  } catch (err) {
    console.error('[email] sendPurchaseInternalEmail failed:', err);
  }
}

export async function sendPurchaseClientEmail(payload: PurchaseEmailPayload): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY no configurado; saltando correo al cliente.', {
      to: payload.buyerEmail,
    });
    return;
  }
  if (!payload.buyerEmail) return;

  const html = layoutWrap(
    `
      <h2 style="margin:0 0 6px; font-size:22px; letter-spacing:-.03em;">¡Gracias por tu compra, ${escapeHtml(
        payload.buyerFullName.split(' ')[0] || 'cliente'
      )}!</h2>
      <p style="margin:0 0 18px; color:#647064; line-height:1.6;">
        Recibimos tu pago de <strong style="color:#162016;">${formatMxn(payload.amount)}</strong>
        por <strong style="color:#162016;">${escapeHtml(payload.motorcycleName ?? 'tu moto')}</strong>.
        Nuestro equipo te contactará en breve para coordinar la entrega y los documentos.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="margin: 16px 0; border:1px solid #e4e9e0; border-radius: 16px; padding: 12px 18px;">
        ${detailsRows(payload)}
      </table>
      <p style="margin:18px 0 6px; color:#162016; font-size:15px;">
        ¿Tienes dudas o quieres ajustar la entrega? Escríbenos por WhatsApp:
      </p>
      ${whatsappButtonHtml(payload.whatsappUrl, `WhatsApp ${payload.whatsappDisplay}`)}
      <p style="margin: 18px 0 0; color:#647064; font-size:12.5px; line-height:1.5;">
        Guarda este correo como comprobante. El ID de pago de Mercado Pago es
        <strong style="color:#162016;">${escapeHtml(payload.paymentId)}</strong>.
      </p>
    `,
    `Confirmación de compra · ${payload.motorcycleName ?? payload.paymentId}`
  );

  try {
    await resend.emails.send({
      from: getFrom(),
      to: [payload.buyerEmail],
      bcc: getBcc() ? [getBcc()!] : undefined,
      subject: `Confirmación de compra · ${payload.motorcycleName ?? site.name}`,
      html,
      replyTo: getNotifyEmail(),
    });
  } catch (err) {
    console.error('[email] sendPurchaseClientEmail failed:', err);
  }
}
