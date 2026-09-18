\pset pager off
SELECT id, slug, title, COALESCE("titleEn",'') AS titleEn, COALESCE("titleJa",'') AS titleJa, COALESCE("titleKo",'') AS titleKo, COALESCE("titleFr",'') AS titleFr, COALESCE("titleAr",'') AS titleAr, "sortOrder", status FROM about_sections ORDER BY "sortOrder", id;
