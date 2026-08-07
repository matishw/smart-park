ALTER TABLE public.parking_reservations ADD COLUMN IF NOT EXISTS owner_key TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS parking_reservations_owner_key_uniq
  ON public.parking_reservations (owner_key)
  WHERE owner_key <> '';

GRANT DELETE ON public.parking_reservations TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can release their own space" ON public.parking_reservations;
CREATE POLICY "Anyone can release their own space"
  ON public.parking_reservations
  FOR DELETE
  TO anon, authenticated
  USING (owner_key <> '');