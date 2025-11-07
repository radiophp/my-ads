DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'DivarCategoryFilter_categoryId_fkey'
  ) THEN
    ALTER TABLE "DivarCategoryFilter"
    ADD CONSTRAINT "DivarCategoryFilter_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "DivarCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
