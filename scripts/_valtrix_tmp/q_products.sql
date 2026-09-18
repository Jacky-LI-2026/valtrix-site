\pset pager off
SELECT id, slug, name, COALESCE("nameEn",'') AS nameEn, "tabId", "categoryId" FROM products ORDER BY id LIMIT 25;
