SELECT id, title, "titleEn", "titleJa", "titleKo", "titleFr", "titleAr",
"subtitleEn", "descriptionEn" IS NOT NULL AS descEn_ok, "featuresEn" IS NOT NULL AS featEn_ok,
"featuresJa" IS NOT NULL AS featJa_ok, "featuresAr" IS NOT NULL AS featAr_ok
FROM services ORDER BY id;