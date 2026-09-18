\pset pager off
\pset format unaligned
\pset fieldsep '|||'
SELECT id, type, title, COALESCE("titleEn",'') AS ten, COALESCE("titleJa",'') AS tja, COALESCE(description,'') AS descr, COALESCE("descriptionEn",'') AS descr_en FROM resource_categories ORDER BY id;
