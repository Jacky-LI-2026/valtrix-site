\pset pager off
\pset format unaligned
\pset fieldsep '|'
SELECT id, COALESCE("parentId",0) AS pid, name, COALESCE("nameEn",'') AS name_en, COALESCE("nameJa",'') AS name_ja, COALESCE("nameKo",'') AS name_ko, COALESCE("nameFr",'') AS name_fr, COALESCE("nameAr",'') AS name_ar, COALESCE(url,'') AS url, "sortOrder", "isActive", COALESCE(icon,'') AS icon
FROM menu ORDER BY COALESCE("parentId",0), "sortOrder", id;
