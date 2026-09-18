\pset pager off
SELECT id, slug, title, COALESCE("titleEn",'') AS titleEn, COALESCE("titleJa",'') AS titleJa, COALESCE("titleKo",'') AS titleKo, COALESCE("titleFr",'') AS titleFr, COALESCE("titleAr",'') AS titleAr, COALESCE(subtitle,'') AS subtitle, COALESCE("subtitleEn",'') AS subtitleEn, "sortOrder", status FROM services ORDER BY "sortOrder", id;
