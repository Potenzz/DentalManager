1. get db backup

2. 
npx prisma migrate dev --create-only --name pdfgroup_titlekey_setup

3. paste this code in migration file: 

```
-- migration: pdfgroup_titlekey_setup
BEGIN;

------------------------------------------------------------------------
-- 1) Create PdfTitle enum type (if not exists) and add nullable column
------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PdfTitle'
  ) THEN
    CREATE TYPE "PdfTitle" AS ENUM (
      'INSURANCE_CLAIM',
      'INSURANCE_STATUS_PDFs',
      'OTHER'
    );
  END IF;
END$$;

ALTER TABLE "PdfGroup"
  ADD COLUMN IF NOT EXISTS "titleKey" "PdfTitle";

------------------------------------------------------------------------
-- 2) Populate titleKey and rename title values
--    - 'Insurance Claim' -> titleKey = INSURANCE_CLAIM
--    - 'Eligibility PDFs' -> titleKey = INSURANCE_STATUS_PDFs and title -> 'Insurance Status PDFs'
------------------------------------------------------------------------
UPDATE "PdfGroup"
SET "titleKey" = 'INSURANCE_CLAIM'
WHERE TRIM("title") = 'Insurance Claim';

UPDATE "PdfGroup"
SET
  "titleKey" = 'INSURANCE_STATUS_PDFs',
  "title" = 'Insurance Status PDFs'
WHERE TRIM("title") = 'Eligibility PDFs';

------------------------------------------------------------------------
-- 3) Safely replace PdfCategory enum values:
--    Strategy:
--      a) change column type to text
--      b) normalize existing text values (map legacy names -> new names)
--      c) create new enum type with desired values
--      d) cast column from text -> new enum
--      e) drop old enum type and rename new enum to PdfCategory
------------------------------------------------------------------------

-- a) Convert column to text (so we can freely rewrite strings)
ALTER TABLE "PdfGroup"
  ALTER COLUMN "category" TYPE text
  USING "category"::text;

-- b) Normalize the textual values
-- mapping rules:
--   'ELIGIBILITY' -> 'ELIGIBILITY_STATUS'
--   'CLAIM'       -> 'CLAIM'
--   'OTHER'       -> 'OTHER'
--   'CLAIM_STATUS'-> 'CLAIM_STATUS'   (if somehow present as text)
-- Any unknown legacy values will be coerced to 'OTHER'
UPDATE "PdfGroup"
SET "category" =
  CASE
    WHEN LOWER(TRIM("category")) = 'eligibility' THEN 'ELIGIBILITY_STATUS'
    WHEN LOWER(TRIM("category")) = 'claim' THEN 'CLAIM'
    WHEN LOWER(TRIM("category")) = 'other' THEN 'OTHER'
    WHEN LOWER(TRIM("category")) = 'claim_status' THEN 'CLAIM_STATUS'
    WHEN LOWER(TRIM("category")) = 'claim status' THEN 'CLAIM_STATUS'
    ELSE 'OTHER'
  END;

-- c) Create the new enum type (with a temporary name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PdfCategory_new'
  ) THEN
    CREATE TYPE "PdfCategory_new" AS ENUM (
      'CLAIM',
      'ELIGIBILITY_STATUS',
      'CLAIM_STATUS',
      'OTHER'
    );
  END IF;
END$$;

-- d) Cast the column from text to the new enum
ALTER TABLE "PdfGroup"
  ALTER COLUMN "category" TYPE "PdfCategory_new"
  USING ("category")::"PdfCategory_new";

-- e) Drop the old enum type (if present) and rename the new type to PdfCategory.
-- First drop old type if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'PdfCategory'
  ) THEN
    EXECUTE 'DROP TYPE "PdfCategory"';
  END IF;

  -- rename new to canonical name
  EXECUTE 'ALTER TYPE "PdfCategory_new" RENAME TO "PdfCategory"';
END$$;

------------------------------------------------------------------------
-- 4) Ensure indexes requested exist
------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "PdfGroup_patientId_idx" ON "PdfGroup" ("patientId");
CREATE INDEX IF NOT EXISTS "PdfGroup_category_idx" ON "PdfGroup" ("category");
CREATE INDEX IF NOT EXISTS "PdfGroup_titleKey_idx" ON "PdfGroup" ("titleKey");

COMMIT;
```


4. apply migrate: 
npx prisma migrate dev


done,