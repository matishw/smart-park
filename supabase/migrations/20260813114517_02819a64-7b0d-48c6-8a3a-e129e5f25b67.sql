CREATE TABLE public.parking_extra_spaces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space integer NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.parking_extra_spaces TO service_role;

ALTER TABLE public.parking_extra_spaces ENABLE ROW LEVEL SECURITY;

SELECT cron.alter_job(
  1,
  command := 'DELETE FROM public.parking_reservations; DELETE FROM public.parking_extra_spaces;'
);