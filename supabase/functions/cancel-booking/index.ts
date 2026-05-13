import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Método no permitido' }, 405);
  }

  let token: string | undefined;
  try {
    const body = await req.json();
    token = body?.token;
  } catch {
    return json({ success: false, error: 'Body inválido' }, 400);
  }

  if (!token || typeof token !== 'string' || token.length < 32) {
    return json({ success: false, error: 'Token inválido' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // bypasses RLS
  );

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('cancel_token', token)
    .neq('status', 'cancelled')
    .select('date, time, service, client_name')
    .single();

  if (error || !data) {
    return json(
      { success: false, error: 'Turno no encontrado o ya cancelado' },
      404,
    );
  }

  return json({ success: true, booking: data });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
