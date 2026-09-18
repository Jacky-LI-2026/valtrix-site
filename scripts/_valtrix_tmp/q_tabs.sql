\pset pager off
SELECT id, slug, COALESCE(name,'') AS name, COALESCE("nameEn",'') AS nameEn, "sortOrder" FROM "ProductTab" ORDER BY "sortOrder", id;
