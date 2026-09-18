\pset pager off
\pset format unaligned
\pset fieldsep '|||'
SELECT slug, name, COALESCE("nameEn",'') AS n_en, COALESCE("nameJa",'') AS n_ja, COALESCE("nameKo",'') AS n_ko, COALESCE("nameFr",'') AS n_fr, COALESCE("nameAr",'') AS n_ar,
COALESCE(tagline,'') AS t_zh, COALESCE("taglineEn",'') AS t_en, COALESCE("taglineJa",'') AS t_ja, COALESCE("taglineKo",'') AS t_ko, COALESCE("taglineFr",'') AS t_fr, COALESCE("taglineAr",'') AS t_ar
FROM industries ORDER BY id;
