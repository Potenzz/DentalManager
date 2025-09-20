1. get db backup

2. 
npx prisma migrate dev --create-only --name remove-category-add-titlekey

3. paste this code in migration file: 

```
-- migration.sql
BEGIN;

-- 0) Safety check: ensure table exists
SELECT 1 FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'PdfGroup';
-- If above returns nothing, stop and check table name/casing.

-- 1) Create the new enum type for Prisma final enum: PdfTitleKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PdfTitleKey') THEN
    CREATE TYPE "PdfTitleKey" AS ENUM (
      'INSURANCE_CLAIM',
      'ELIGIBILITY_STATUS',
      'CLAIM_STATUS',
      'OTHER'
    );
  END IF;
END$$;

-- 2) Add the temporary nullable column titleKey_new of that enum type
ALTER TABLE "PdfGroup" ADD COLUMN IF NOT EXISTS "titleKey_new" "PdfTitleKey";

-- 3) Populate titleKey_new from the existing columns
--    Mapping rules:
--      - If titleKey exists, prefer it (map INSURANCE_STATUS_PDFs -> ELIGIBILITY_STATUS)
--      - Else, if category exists use that mapping
--      - Else fallback to 'OTHER'
UPDATE "PdfGroup"
SET "titleKey_new" = (
  CASE
    WHEN "titleKey" IS NOT NULL THEN
      CASE "titleKey"
        WHEN 'INSURANCE_CLAIM' THEN 'INSURANCE_CLAIM'::"PdfTitleKey"
        WHEN 'INSURANCE_STATUS_PDFs' THEN 'ELIGIBILITY_STATUS'::"PdfTitleKey"  -- renamed mapping
        WHEN 'OTHER' THEN 'OTHER'::"PdfTitleKey"
        ELSE 'OTHER'::"PdfTitleKey"
      END
    WHEN "category" IS NOT NULL THEN
      CASE "category"
        WHEN 'CLAIM' THEN 'INSURANCE_CLAIM'::"PdfTitleKey"
        WHEN 'ELIGIBILITY_STATUS' THEN 'ELIGIBILITY_STATUS'::"PdfTitleKey"
        WHEN 'CLAIM_STATUS' THEN 'CLAIM_STATUS'::"PdfTitleKey"
        WHEN 'OTHER' THEN 'OTHER'::"PdfTitleKey"
        ELSE 'OTHER'::"PdfTitleKey"
      END
    ELSE 'OTHER'::"PdfTitleKey"
  END
)
WHERE "titleKey_new" IS NULL; -- only set rows that aren't populated

-- 4) Sanity check: abort if any rows failed to populate
--    If this returns > 0 you should inspect before continuing.
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM "PdfGroup" WHERE "titleKey_new" IS NULL;
  IF cnt > 0 THEN
    RAISE NOTICE 'Warning: % PdfGroup rows have NULL titleKey_new after mapping', cnt;
    -- We don't abort automatically; you can uncomment next line to abort.
    -- RAISE EXCEPTION 'Migration aborted: not all rows have titleKey_new';
  END IF;
END$$;

-- 5) Drop index on category if it exists (index name varies by setup).
--    We attempt to find any index that uses category on PdfGroup and drop it.
DO $$
DECLARE
  idx record;
BEGIN
  FOR idx IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'PdfGroup' AND indexdef LIKE '%("category"%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I;', idx.indexname);
  END LOOP;
END$$;

-- 6) Drop the category column
ALTER TABLE "PdfGroup" DROP COLUMN IF EXISTS "category";

-- 7) Drop index on old titleKey if exists (index name may vary)
DO $$
DECLARE
  idx record;
BEGIN
  FOR idx IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'PdfGroup' AND indexdef LIKE '%("titleKey"%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I;', idx.indexname);
  END LOOP;
END$$;

-- 8) Drop the old titleKey column (which uses the old enum PdfTitle)
ALTER TABLE "PdfGroup" DROP COLUMN IF EXISTS "titleKey";

-- 9) Rename the new column to titleKey
ALTER TABLE "PdfGroup" RENAME COLUMN "titleKey_new" TO "titleKey";

-- 10) Recreate index on titleKey
CREATE INDEX IF NOT EXISTS "PdfGroup_titleKey_idx" ON "PdfGroup" ("titleKey");

-- 11) Drop the old enum types if they are no longer used
--    Only drop if no columns are using them.
DO $$
BEGIN
  -- Drop old PdfTitle enum if exists and unused
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PdfTitle') THEN
    IF NOT EXISTS (
       SELECT 1 FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE a.atttypid = (SELECT oid FROM pg_type WHERE typname = 'PdfTitle')
    ) THEN
      EXECUTE 'DROP TYPE IF EXISTS "PdfTitle"';
    END IF;
  END IF;

  -- Drop old PdfCategory enum similarly
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PdfCategory') THEN
    IF NOT EXISTS (
       SELECT 1 FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       JOIN pg_namespace n ON c.relnamespace = n.oid
       WHERE a.atttypid = (SELECT oid FROM pg_type WHERE typname = 'PdfCategory')
    ) THEN
      EXECUTE 'DROP TYPE IF EXISTS "PdfCategory"';
    END IF;
  END IF;
END$$;

COMMIT;
```


4. apply migrate: 
npx prisma migrate dev


done,