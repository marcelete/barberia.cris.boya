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

  const { service, price, date, time, client_name, client_phone, client_email } = body as {
    service: string; price: number; date: string;
    time: string; client_name: string; client_phone: string; client_email?: string;
  };

  // Formatear fecha legible
  const [y, m, d] = (date as string).split('-').map(Number);
  const dateStr = new Date(y, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const priceStr = `$${Number(price).toLocaleString('es-AR')}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#141414;border:1px solid rgba(201,168,76,.25);border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#1c1c1c;padding:28px 32px;border-bottom:1px solid rgba(201,168,76,.2);">
          <p style="margin:0;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#c9a84c;font-weight:600;">Barber Boya</p>
          <h1 style="margin:8px 0 0;font-size:22px;color:#f0ece3;font-weight:700;">Nuevo turno reservado 💈</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${row('Servicio',    String(service))}
            ${row('Fecha',       dateStr)}
            ${row('Horario',     `${time} hs`)}
            ${row('Precio',      priceStr)}
            ${row('Cliente',     String(client_name))}
            ${row('WhatsApp',    String(client_phone))}
            ${row('Email',       client_email ? String(client_email) : '—', true)}
          </table>
        </td></tr>

        <!-- Footer -->
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

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    'Barber Boya <onboarding@resend.dev>',
      to:      [Deno.env.get('NOTIFY_EMAIL')!],
      subject: `Nuevo turno: ${service} · ${dateStr} ${time} hs`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    console.error('Resend error:', err);
    return json({ success: false, error: 'Error al enviar email' }, 500);
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
