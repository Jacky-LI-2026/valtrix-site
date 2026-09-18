-- VALTRIX industries 少量质量修正（tagline/name 六语种已全，仅修明显误译）
\set ON_ERROR_STOP on

UPDATE industries SET
  "taglineKo"='웨이퍼 팹을 위한 초고순도 유체 제어',
  "taglineFr"='Contrôle des fluides ultra-haute pureté pour les fabs de semi-conducteurs',
  "taglineAr"='التحكم في السوائل فائقة النقاء لمصانع الرقاقات'
WHERE slug='semiconductor';

UPDATE industries SET
  "nameAr"='الصناعات الدوائية الحيوية'
WHERE slug='biopharmaceutical';

UPDATE industries SET
  "nameKo"='태양광 및 태양광 발전',
  "nameAr"='الطاقة الشمسية والكهروضوئية',
  "taglineAr"='مكونات سائلة عالية الموثوقية لتصنيع الخلايا الشمسية'
WHERE slug='solar-photovoltaic';

UPDATE industries SET
  "nameFr"='Énergie hydrogène'
WHERE slug='hydrogen-energy';

UPDATE industries SET
  "nameJa"='研究・実験室',
  "nameKo"='연구 실험실',
  "nameFr"='Laboratoires de recherche'
WHERE slug='research-labs';
