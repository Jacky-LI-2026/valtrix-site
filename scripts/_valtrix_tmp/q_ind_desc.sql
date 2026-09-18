\pset pager off
SELECT slug, name, COALESCE("nameEn",'') AS nameEn, COALESCE(tagline,'') AS tagline, COALESCE("taglineEn",'') AS taglineEn, COALESCE(description,'') AS description, COALESCE("descriptionEn",'') AS descriptionEn FROM industries ORDER BY id;
