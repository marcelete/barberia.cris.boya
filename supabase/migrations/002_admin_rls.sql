-- ============================================================
-- BARBER BOYA — Políticas de admin (usuario autenticado)
-- Ejecutar en Supabase > SQL Editor DESPUÉS de 001_bookings.sql
-- ============================================================

-- Los usuarios autenticados (Cristian / admin) pueden ver todos los turnos
CREATE POLICY "auth_select_all" ON public.bookings
  FOR SELECT TO authenticated
  USING (true);

-- Los usuarios autenticados pueden actualizar cualquier turno (cancelar, etc.)
CREATE POLICY "auth_update_all" ON public.bookings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT 'Admin RLS configurado ✓' AS resultado;
