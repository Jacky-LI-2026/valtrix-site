\pset pager off
SELECT id, slug, title, COALESCE("titleEn",'') AS title_en, COALESCE("subtitle",'') AS subtitle, COALESCE("subtitleEn",'') AS subtitle_en,
  COALESCE(json_array_length(content::json),0) AS content_blocks,
  LEFT(content::text, 400) AS content_head,
  COALESCE(LEFT("contentEn"::text, 300),'') AS content_en_head
FROM about_sections ORDER BY id;
