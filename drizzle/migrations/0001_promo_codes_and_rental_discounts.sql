CREATE TABLE public.promo_codes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{3,40}$'),
 discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
 active boolean NOT NULL DEFAULT true,
 expires_at timestamptz,
 max_uses integer CHECK (max_uses > 0),
 uses_count integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage promo codes" ON public.promo_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.promo_redemptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 promo_id uuid NOT NULL REFERENCES public.promo_codes(id),
 discount_percent integer NOT NULL,
 redeemed_at timestamptz NOT NULL DEFAULT now(),
 consumed_at timestamptz,
 UNIQUE(user_id, promo_id)
);
GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own redemptions" ON public.promo_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX one_active_promo_per_user ON public.promo_redemptions(user_id) WHERE consumed_at IS NULL;
CREATE OR REPLACE FUNCTION public.my_active_promo()
RETURNS TABLE(code text, discount_percent integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT p.code, r.discount_percent FROM promo_redemptions r JOIN promo_codes p ON p.id=r.promo_id
 WHERE r.user_id=auth.uid() AND r.consumed_at IS NULL AND p.active AND (p.expires_at IS NULL OR p.expires_at > now())
$$;
REVOKE ALL ON FUNCTION public.my_active_promo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_active_promo() TO authenticated;
CREATE OR REPLACE FUNCTION public.redeem_promo(_code text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p promo_codes;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
 IF _code IS NULL OR length(trim(_code)) < 3 OR length(trim(_code)) > 40 THEN RAISE EXCEPTION 'invalid_promo'; END IF;
 PERFORM my_profile();
 PERFORM 1 FROM profiles WHERE id=auth.uid() FOR UPDATE;
 SELECT * INTO p FROM promo_codes WHERE code=upper(trim(_code)) FOR UPDATE;
 IF p.id IS NULL OR NOT p.active OR (p.expires_at IS NOT NULL AND p.expires_at <= now()) THEN RAISE EXCEPTION 'invalid_promo'; END IF;
 IF EXISTS (SELECT 1 FROM promo_redemptions WHERE user_id=auth.uid() AND promo_id=p.id) THEN RAISE EXCEPTION 'promo_already_used'; END IF;
 IF p.max_uses IS NOT NULL AND p.uses_count >= p.max_uses THEN RAISE EXCEPTION 'promo_limit'; END IF;
 UPDATE promo_redemptions SET consumed_at=now() WHERE user_id=auth.uid() AND consumed_at IS NULL;
 INSERT INTO promo_redemptions(user_id,promo_id,discount_percent) VALUES(auth.uid(),p.id,p.discount_percent);
 UPDATE promo_codes SET uses_count=uses_count+1 WHERE id=p.id;
 RETURN p.discount_percent;
END $$;
REVOKE ALL ON FUNCTION public.redeem_promo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_promo(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.consume_active_promo(_uid uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE discount integer;
BEGIN
 SELECT r.discount_percent INTO discount FROM promo_redemptions r JOIN promo_codes p ON p.id=r.promo_id
 WHERE r.user_id=_uid AND r.consumed_at IS NULL AND p.active AND (p.expires_at IS NULL OR p.expires_at>now()) FOR UPDATE OF r,p;
 UPDATE promo_redemptions SET consumed_at=now() WHERE user_id=_uid AND consumed_at IS NULL;
 RETURN coalesce(discount,0);
END $$;
REVOKE ALL ON FUNCTION public.consume_active_promo(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_active_promo(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.start_rental_prepaid(_computer_id uuid, _game_id uuid, _hours integer)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c computers; g games; bal int; url text; isblocked boolean; rate int; total int; discount int;
BEGIN
 IF _hours IS NULL OR _hours < 1 OR _hours > 24 THEN RAISE EXCEPTION 'bad_hours'; END IF;
 PERFORM my_profile();
 SELECT blocked,balance INTO isblocked,bal FROM profiles WHERE id=auth.uid() FOR UPDATE;
 IF isblocked THEN RAISE EXCEPTION 'user_blocked'; END IF;
 IF EXISTS (SELECT 1 FROM rental_sessions WHERE user_id=auth.uid() AND ended_at IS NULL) THEN RAISE EXCEPTION 'active_session'; END IF;
 SELECT * INTO g FROM games WHERE id=_game_id AND published;
 IF g.id IS NULL THEN RAISE EXCEPTION 'not_available'; END IF;
 SELECT * INTO c FROM computers WHERE id=_computer_id FOR UPDATE;
 IF c.id IS NULL OR NOT c.available OR c.blocked THEN RAISE EXCEPTION 'not_available'; END IF;
 discount := consume_active_promo(auth.uid());
 rate := round(round(g.price * (100-g.discount_percent)/100.0) * (100-discount)/100.0);
 total := rate*_hours;
 IF bal < total THEN RAISE EXCEPTION 'insufficient_funds'; END IF;
 SELECT rent_url INTO url FROM computer_links WHERE computer_id=c.id;
 IF coalesce(url,'')='' THEN RAISE EXCEPTION 'no_link'; END IF;
 UPDATE profiles SET balance=balance-total WHERE id=auth.uid();
 INSERT INTO rental_sessions(user_id,computer_id,computer_name,price_per_hour,paid_until,total_charged)
 VALUES(auth.uid(),c.id,c.name,rate,now()+make_interval(hours=>_hours),total);
 UPDATE computers SET available=false WHERE id=c.id;
 RETURN url;
END $$;
CREATE OR REPLACE FUNCTION public.start_rental(_computer_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c computers; bal int; url text; isblocked boolean; rate int;
BEGIN
 PERFORM my_profile();
 SELECT blocked,balance INTO isblocked,bal FROM profiles WHERE id=auth.uid() FOR UPDATE;
 IF isblocked THEN RAISE EXCEPTION 'user_blocked'; END IF;
 IF EXISTS (SELECT 1 FROM rental_sessions WHERE user_id=auth.uid() AND ended_at IS NULL) THEN RAISE EXCEPTION 'active_session'; END IF;
 SELECT * INTO c FROM computers WHERE id=_computer_id FOR UPDATE;
 IF c.id IS NULL OR NOT c.available OR c.blocked THEN RAISE EXCEPTION 'not_available'; END IF;
 rate := round(c.price*(100-consume_active_promo(auth.uid()))/100.0);
 IF bal < rate THEN RAISE EXCEPTION 'insufficient_funds'; END IF;
 SELECT rent_url INTO url FROM computer_links WHERE computer_id=c.id;
 IF coalesce(url,'')='' THEN RAISE EXCEPTION 'no_link'; END IF;
 UPDATE profiles SET balance=balance-rate WHERE id=auth.uid();
 INSERT INTO rental_sessions(user_id,computer_id,computer_name,price_per_hour,paid_until,total_charged) VALUES(auth.uid(),c.id,c.name,rate,now()+interval '1 hour',rate);
 UPDATE computers SET available=false WHERE id=c.id;
 RETURN url;
END $$;