CREATE TABLE public.parking_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space integer NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.parking_reservations TO anon;
GRANT SELECT, INSERT, DELETE ON public.parking_reservations TO authenticated;
GRANT ALL ON public.parking_reservations TO service_role;

ALTER TABLE public.parking_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reservations"
ON public.parking_reservations FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can reserve a space"
ON public.parking_reservations FOR INSERT TO anon, authenticated
WITH CHECK (space IN (126,127,155,212,217,239));

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'reset-parking-daily-2000',
  '0 20 * * *',
  $$ DELETE FROM public.parking_reservations $$
);