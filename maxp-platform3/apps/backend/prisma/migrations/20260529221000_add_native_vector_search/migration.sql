-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "embedding_array" double precision[];
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "embedding_image_array" double precision[];

-- Create dot_product function
CREATE OR REPLACE FUNCTION dot_product(a double precision[], b double precision[])
RETURNS double precision AS $$
DECLARE
  s double precision := 0;
  i int;
  len int;
BEGIN
  len := array_length(a, 1);
  IF len IS NULL OR array_length(b, 1) != len THEN
    RETURN 0;
  END IF;
  FOR i IN 1..len LOOP
    s := s + a[i] * b[i];
  END LOOP;
  RETURN s;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger function to sync embedding strings into double precision arrays
CREATE OR REPLACE FUNCTION sync_product_arrays_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.embedding IS NOT NULL THEN
    BEGIN
      NEW.embedding_array := ARRAY(
        SELECT json_array_elements_text(NEW.embedding::json)::double precision
      );
    EXCEPTION WHEN OTHERS THEN
      NEW.embedding_array := NULL;
    END;
  ELSE
    NEW.embedding_array := NULL;
  END IF;

  IF NEW."embeddingImage" IS NOT NULL THEN
    BEGIN
      NEW.embedding_image_array := ARRAY(
        SELECT json_array_elements_text(NEW."embeddingImage"::json)::double precision
      );
    EXCEPTION WHEN OTHERS THEN
      NEW.embedding_image_array := NULL;
    END;
  ELSE
    NEW.embedding_image_array := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run sync on insert/update
DROP TRIGGER IF EXISTS sync_product_arrays_trigger ON products;
CREATE TRIGGER sync_product_arrays_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION sync_product_arrays_fn();

-- Backfill existing products
UPDATE products 
SET "updatedAt" = NOW() 
WHERE embedding IS NOT NULL OR "embeddingImage" IS NOT NULL;
