-- ============================================================
-- BARBER BOYA — Corregir permisos del rol anon
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- Sin este GRANT, la política RLS "anon_insert" no alcanza:
-- el rol anon necesita privilegio de INSERT a nivel de tabla
-- además de tener una política RLS que lo permita.
GRANT INSERT ON public.bookings TO anon;

-- También aseguramos que pueda leer la vista de disponibilidad
-- (ya estaba, pero lo dejamos idempotente)
GRANT SELECT ON public.slot_availability TO anon;

SELECT 'Grants de anon corregidos ✓' AS resultado;
