const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Body inválido' }, 400);
  }

  const { service, price, date, time, client_name, client_phone, client_email, cancel_url } = body as {
    service: string; price: number; date: string; time: string;
    client_name: string; client_phone: string; client_email?: string; cancel_url?: string;
  };

  const [y, m, d] = (date as string).split('-').map(Number);
  const dateStr = new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const priceStr = `$${Number(price).toLocaleString('es-AR')}`;

  const RESEND_KEY  = Deno.env.get('RESEND_API_KEY')!;
  const NOTIFY_EMAIL = Deno.env.get('NOTIFY_EMAIL')!;
  // CRISTIAN_EMAIL es opcional: si está definido, Cristian recibe el email en su cuenta propia.
  // Si no está definido, se usa NOTIFY_EMAIL como destino del admin.
  const CRISTIAN_EMAIL = Deno.env.get('CRISTIAN_EMAIL') || NOTIFY_EMAIL;
  const FROM = 'Barber Boya <onboarding@resend.dev>';

  // ── 1. Email al admin (Cristian) ──────────────────────────────────────────
  const adminHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border:1px solid rgba(201,168,76,.25);border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#1c1c1c;padding:28px 32px;border-bottom:1px solid rgba(201,168,76,.2);">
          <p style="margin:0;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#c9a84c;font-weight:600;">Barber Boya</p>
          <h1 style="margin:8px 0 0;font-size:22px;color:#f0ece3;font-weight:700;">Nuevo turno reservado 💈</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Servicio',  String(service))}
            ${row('Fecha',     dateStr)}
            ${row('Horario',   `${time} hs`)}
            ${row('Precio',    priceStr)}
            ${row('Cliente',   String(client_name))}
            ${row('WhatsApp',  String(client_phone))}
            ${row('Email',     client_email ? String(client_email) : '—', true)}
          </table>
        </td></tr>
        <tr><td style="background:#0d0d0d;padding:20px 32px;border-top:1px solid rgba(201,168,76,.1);">
          <p style="margin:0;font-size:12px;color:#555;text-align:center;">
            Este mail fue generado automáticamente por el sistema de turnos de Barber Boya.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Destinatarios del admin: CRISTIAN_EMAIL siempre; NOTIFY_EMAIL solo si es distinto
  const adminRecipients = CRISTIAN_EMAIL === NOTIFY_EMAIL
    ? [NOTIFY_EMAIL]
    : [CRISTIAN_EMAIL, NOTIFY_EMAIL];

  const adminRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to:      adminRecipients,
      subject: `Nuevo turno: ${service} · ${dateStr} ${time} hs`,
      html:    adminHtml,
    }),
  });

  if (!adminRes.ok) {
    const err = await adminRes.text();
    console.error('Resend admin error:', err);
    return json({ success: false, error: 'Error al enviar email al admin' }, 500);
  }

  // ── 2. Email de confirmación al cliente ───────────────────────────────────
  if (client_email) {
    const firstName = String(client_name).split(' ')[0];
    const cancelSection = cancel_url
      ? `<tr><td colspan="2" style="padding:20px 0 4px;">
           <a href="${cancel_url}" style="display:inline-block;padding:10px 20px;background:#c9a84c;color:#0d0d0d;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">Cancelar turno</a>
         </td></tr>
         <tr><td colspan="2" style="padding:4px 0 12px;">
           <p style="margin:0;font-size:11px;color:#555;">O copiá este link: <span style="color:#888;">${cancel_url}</span></p>
         </td></tr>`
      : '';

    const clientHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border:1px solid rgba(201,168,76,.25);border-radius:12px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#1c1c1c;padding:28px 32px;border-bottom:1px solid rgba(201,168,76,.2);">
          <p style="margin:0;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#c9a84c;font-weight:600;">Barber Boya</p>
          <h1 style="margin:8px 0 0;font-size:22px;color:#f0ece3;font-weight:700;">Tu turno está confirmado ✅</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#c8c0b0;">
            Hola <strong style="color:#f0ece3;">${firstName}</strong>, te esperamos 💈
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Servicio', String(service))}
            ${row('Fecha',    dateStr)}
            ${row('Horario',  `${time} hs`)}
            ${row('Precio',   priceStr)}
            ${cancelSection}
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#666;">
            Si necesitás cancelar con más de 24 hs de anticipación, usá el botón de arriba.
          </p>
        </td></tr>
        <tr><td style="background:#0d0d0d;padding:20px 32px;border-top:1px solid rgba(201,168,76,.1);">
          <p style="margin:0;font-size:12px;color:#555;text-align:center;">
            Este mail fue generado automáticamente. No respondas este correo.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const clientRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to:      [client_email],
        subject: `Turno confirmado en Barber Boya · ${dateStr} ${time} hs`,
        html:    clientHtml,
      }),
    });

    if (!clientRes.ok) {
      // No bloqueamos la respuesta si falla el email al cliente, pero sí lo logueamos
      console.error('Resend client error:', await clientRes.text());
    }
  }

  return json({ success: true });
});

function row(label: string, value: string, isLast = false) {
  const border = isLast ? '' : 'border-bottom:1px solid rgba(255,255,255,.06);';
  return `
    <tr>
      <td style="padding:12px 0;${border}color:#888;font-size:13px;width:40%;">${label}</td>
      <td style="padding:12px 0;${border}color:#f0ece3;font-size:14px;font-weight:600;">${value}</td>
    </tr>`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
