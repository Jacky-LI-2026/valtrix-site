\pset pager off
SELECT id, name, "nameEn", COALESCE("nameJa",'') AS nameJa, COALESCE("nameKo",'') AS nameKo, COALESCE("nameFr",'') AS nameFr, COALESCE("nameAr",'') AS nameAr, url, "parentId", "sortOrder", "isActive"
FROM menu ORDER BY "sortOrder", id;
