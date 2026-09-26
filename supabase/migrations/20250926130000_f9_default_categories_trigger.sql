-- F9-R5: new tenants automatically get the default categories
-- (Träning, Privatlektion, Föreningsaktivitet) on creation.
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.categories (tenant_id, name, color, sort_order)
  VALUES
    (NEW.id, 'Träning', '#0B6E4F', 0),
    (NEW.id, 'Privatlektion', '#8E5B3F', 1),
    (NEW.id, 'Föreningsaktivitet', '#3F5B8E', 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_categories ON public.tenants;
CREATE TRIGGER trg_seed_default_categories
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_categories();
