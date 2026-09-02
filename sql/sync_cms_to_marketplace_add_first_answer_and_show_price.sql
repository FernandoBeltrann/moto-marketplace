-- Actualiza sync_cms_to_marketplace() para que también reenvíe
-- first_answer/show_price de cms_marketplace hacia motorcycles.
-- Todo lo demás es idéntico a la versión actual (obtenida via pg_get_functiondef).
--
-- Requisito previo: haber corrido sql/motorcycles_add_first_answer_and_show_price.sql
-- (agrega las columnas en cms_marketplace y motorcycles). Si corres esta función
-- antes de que existan las columnas, el INSERT fallará por columna inexistente.

CREATE OR REPLACE FUNCTION public.sync_cms_to_marketplace()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE motorcycles SET published = false, updated_at = now() WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO motorcycles
    (id, brand, model, year, slug, price, promo_price, category, engine_cc, monthly_from,
     suggested_down_payment, short_description, priority_score, available_cities, tags, best_for,
     specs, published, updated_at, image_url, gallery_urls, purchase_url, card_price, finva_motorcycle_id,
     first_answer, show_price)
  VALUES
    (NEW.id, NEW.brand, NEW.model, NEW.year, NEW.slug, NEW.price, NEW.promo_price, NEW.category, NEW.engine_cc, NEW.monthly_from,
     NEW.suggested_down_payment, NEW.short_description, NEW.priority_score, NEW.available_cities, NEW.tags, NEW.best_for,
     NEW.specs, NEW.published, now(), NEW.image_url, NEW.gallery_urls, NEW.purchase_url, NEW.card_price, NEW.finva_motorcycle_id,
     NEW.first_answer, NEW.show_price)
  ON CONFLICT (id) DO UPDATE SET
    brand = EXCLUDED.brand, model = EXCLUDED.model, year = EXCLUDED.year, slug = EXCLUDED.slug,
    price = EXCLUDED.price, promo_price = EXCLUDED.promo_price, category = EXCLUDED.category,
    engine_cc = EXCLUDED.engine_cc, monthly_from = EXCLUDED.monthly_from,
    suggested_down_payment = EXCLUDED.suggested_down_payment, short_description = EXCLUDED.short_description,
    priority_score = EXCLUDED.priority_score, available_cities = EXCLUDED.available_cities,
    tags = EXCLUDED.tags, best_for = EXCLUDED.best_for, specs = EXCLUDED.specs,
    published = EXCLUDED.published, updated_at = now(), image_url = EXCLUDED.image_url,
    gallery_urls = EXCLUDED.gallery_urls, purchase_url = EXCLUDED.purchase_url,
    card_price = EXCLUDED.card_price, finva_motorcycle_id = EXCLUDED.finva_motorcycle_id,
    first_answer = EXCLUDED.first_answer, show_price = EXCLUDED.show_price;

  RETURN NEW;
END;
$function$
