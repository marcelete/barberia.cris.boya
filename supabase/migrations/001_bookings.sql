-- ============================================================
-- BARBER BOYA — Schema de reservas
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- Tabla principal de turnos
CREATE TABLE IF NOT EXISTS public.bookings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service       TEXT        NOT NULL,
  price         INTEGER     NOT NULL,
  barber        TEXT        NOT NULL DEFAULT 'Cristian Boyatjián',
  date          DATE        NOT NULL,
  time          TEXT        NOT NULL,  -- "14:00"
  client_name   TEXT        NOT NULL,
  client_phone  TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'cancelled')),
  cancel_token  UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice único parcial: evita doble reserva en el mismo slot
-- Un slot cancelado puede volver a reservarse
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_slot
  ON public.bookings (date, time)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS bookings_date_idx ON public.bookings (date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Anon puede insertar (crear reservas)
CREATE POLICY "anon_insert" ON public.bookings
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon NO puede SELECT, UPDATE ni DELETE directamente
-- Las cancelaciones pasan por la Edge Function (service_role)

-- ============================================================
-- VISTA DE DISPONIBILIDAD (solo date + time, sin datos personales)
-- ============================================================
CREATE OR REPLACE VIEW public.slot_availability AS
  SELECT date::text AS date, time
  FROM   public.bookings
  WHERE  status = 'pending';

-- Dar acceso de lectura al rol anon sobre la vista
GRANT SELECT ON public.slot_availability TO anon;

-- ============================================================
-- Confirmar
-- ============================================================
SELECT 'Setup completo ✓' AS resultado;
