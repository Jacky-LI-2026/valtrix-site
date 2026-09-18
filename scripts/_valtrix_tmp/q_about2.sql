\pset pager off
SELECT id, slug, title, COALESCE("titleEn",'') AS titleEn, COALESCE("titleJa",'') AS titleJa,
  CASE WHEN content IS NULL OR content = '[]'::jsonb THEN 'EMPTY' ELSE 'OK' END AS contentZh,
  CASE WHEN "contentEn" IS NULL OR "contentEn" = '[]'::jsonb THEN 'EMPTY' ELSE 'OK' END AS contentEn,
  CASE WHEN "contentJa" IS NULL OR "contentJa" = '[]'::jsonb THEN 'EMPTY' ELSE 'OK' END AS contentJa,
  CASE WHEN "contentKo" IS NULL OR "contentKo" = '[]'::jsonb THEN 'EMPTY' ELSE 'OK' END AS contentKo,
  CASE WHEN "contentFr" IS NULL OR "contentFr" = '[]'::jsonb THEN 'EMPTY' ELSE 'OK' END AS contentFr,
  CASE WHEN "contentAr" IS NULL OR "contentAr" = '[]'::jsonb THEN 'EMPTY' ELSE 'OK' END AS contentAr,
  COALESCE(subtitle,'') AS subtitle, COALESCE("subtitleEn",'') AS subtitleEn, COALESCE("subtitleJa",'') AS subtitleJa, COALESCE("subtitleKo",'') AS subtitleKo, COALESCE("subtitleFr",'') AS subtitleFr, COALESCE("subtitleAr",'') AS subtitleAr
FROM about_sections ORDER BY id;
