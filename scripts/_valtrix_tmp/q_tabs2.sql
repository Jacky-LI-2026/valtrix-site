\pset pager off
SELECT id, slug, COALESCE(name,'') AS name, COALESCE("nameEn",'') AS nameEn, "sortOrder" FROM product_tabs ORDER BY "sortOrder", id;
