DROP POLICY IF EXISTS "Anyone can release their own space" ON public.parking_reservations;
DROP POLICY IF EXISTS "Anyone can reserve a space" ON public.parking_reservations;
DROP POLICY IF EXISTS "Anyone can view reservations" ON public.parking_reservations;

REVOKE ALL ON public.parking_reservations FROM anon;
REVOKE ALL ON public.parking_reservations FROM authenticated;
GRANT ALL ON public.parking_reservations TO service_role;

ALTER TABLE public.parking_reservations ENABLE ROW LEVEL SECURITY;