-- ============================================================
-- BARBER BOYA — Agregar email del cliente
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- Si la tabla ya existe, agregar la columna (nullable para no romper reservas previas)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_email TEXT;

SELECT 'Columna client_email agregada ✓' AS resultado;
