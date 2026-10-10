CREATE OR REPLACE FUNCTION public.handle_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF lower(NEW.email) = 'verewal8@gmail.com' THEN
    INSERT INTO public.user_roles(user_id, role) SELECT NEW.id, 'admin'
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_owner_admin ON auth.users;
CREATE TRIGGER on_auth_user_owner_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_owner_admin();
INSERT INTO public.user_roles(user_id, role)
SELECT u.id, 'admin' FROM auth.users u
WHERE lower(u.email) = 'verewal8@gmail.com'
AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin');