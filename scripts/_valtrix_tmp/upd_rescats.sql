-- VALTRIX resource_categories title/description 六语种补全
\set ON_ERROR_STOP on

UPDATE resource_categories SET
  "titleJa"='製品マニュアル', "titleKo"='제품 매뉴얼', "titleFr"='Manuels produits', "titleAr"='دليل المنتج',
  "descriptionJa"='製品カタログ・取扱説明書・技術仕様書', "descriptionKo"='제품 카탈로그, 설치 및 사용 설명서, 기술 사양서', "descriptionFr"='Catalogues produits, manuels d''installation et d''utilisation', "descriptionAr"='كتالوجات المنتج وأدلة التركيب والاستخدام'
WHERE id=1;

UPDATE resource_categories SET
  "titleJa"='認証書', "titleKo"='인증서', "titleFr"='Certificats', "titleAr"='شهادات الاعتماد',
  "descriptionJa"='製品認証と会社資格証明書', "descriptionKo"='제품 인증 및 회사 자격 증명서', "descriptionFr"='Certifications produits et certificats de qualification de l''entreprise', "descriptionAr"='شهادات اعتماد المنتج ومؤهلات الشركة'
WHERE id=2;

UPDATE resource_categories SET
  "titleJa"='図面資料', "titleKo"='도면 자료', "titleFr"='Plans techniques', "titleAr"='الرسومات الفنية',
  "descriptionJa"='製品図面と技術資料', "descriptionKo"='제품 도면 및 기술 자료', "descriptionFr"='Plans produits et données techniques', "descriptionAr"='رسومات المنتج والبيانات الفنية'
WHERE id=3;
