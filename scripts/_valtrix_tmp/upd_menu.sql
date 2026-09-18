-- VALTRIX menu 表：多语种名称补全 + 软404 url 修复 + 新增资源中心/人才招聘
\set ON_ERROR_STOP on

-- ========== 顶级导航多语种 ==========
UPDATE menu SET "nameJa"='製品', "nameKo"='제품', "nameFr"='Produits', "nameAr"='المنتجات' WHERE id=137;
UPDATE menu SET "nameJa"='応用分野', "nameKo"='응용 분야', "nameFr"='Domaines d''application', "nameAr"='مجالات التطبيق' WHERE id=144;
UPDATE menu SET "nameJa"='ニュース', "nameKo"='뉴스', "nameFr"='Actualités', "nameAr"='الأخبار' WHERE id=151;
UPDATE menu SET "nameJa"='当社について', "nameKo"='회사 소개', "nameFr"='À propos de nous', "nameAr"='من نحن' WHERE id=158;
UPDATE menu SET "nameJa"='お問い合わせ', "nameKo"='문의하기', "nameFr"='Contactez-nous', "nameAr"='تواصل معنا' WHERE id=162;

-- ========== 产品中心子项多语种 ==========
UPDATE menu SET "nameJa"='VCR面シール継手', "nameKo"='VCR 페이스 씰 피팅', "nameFr"='Raccords d''étanchéité de surface VCR', "nameAr"='وصلة ختم سطح VCR' WHERE id=138;
UPDATE menu SET "nameJa"='溶接継手', "nameKo"='용접 피팅', "nameFr"='Raccords soudés', "nameAr"='وصلات ملحومة' WHERE id=139;
UPDATE menu SET "nameJa"='ダイヤフラムバルブ', "nameKo"='다이어프램 밸브', "nameFr"='Vannes à membrane', "nameAr"='صمامات الحجاب الحاجز' WHERE id=140;
UPDATE menu SET "nameJa"='減圧弁', "nameKo"='감압 밸브', "nameFr"='Détendeurs', "nameAr"='صمامات تخفيض الضغط' WHERE id=141;
UPDATE menu SET "nameJa"='逆止弁', "nameKo"='체크 밸브', "nameFr"='Clapets antiretour', "nameAr"='صمامات عدم الرجوع' WHERE id=142;
UPDATE menu SET "nameJa"='ガスフィルター', "nameKo"='가스 필터', "nameFr"='Filtres à gaz', "nameAr"='مرشحات الغاز' WHERE id=143;

-- ========== 应用领域子项：替换为实际 6 行业（名称多语种 + url 修复） ==========
UPDATE menu SET name='半导体制造', "nameEn"='Semiconductor Manufacturing', "nameJa"='半導体製造', "nameKo"='반도체 제조', "nameFr"='Fabrication de semi-conducteurs', "nameAr"='تصنيع أشباه الموصلات', url='/industries/semiconductor' WHERE id=145;
UPDATE menu SET name='生物医药', "nameEn"='Biopharmaceutical', "nameJa"='バイオ医薬品', "nameKo"='바이오 제약', "nameFr"='Biopharmaceutique', "nameAr"='الصناعات الدوائية الحيوية', url='/industries/biopharmaceutical' WHERE id=146;
UPDATE menu SET name='LED显示', "nameEn"='LED & Display', "nameJa"='LED・ディスプレイ', "nameKo"='LED & 디스플레이', "nameFr"='LED & Affichage', "nameAr"='LED والعرض', url='/industries/led-display' WHERE id=147;
UPDATE menu SET name='光伏', "nameEn"='Solar & Photovoltaic', "nameJa"='ソーラー・太陽光発電', "nameKo"='태양광 발전', "nameFr"='Solaire et photovoltaïque', "nameAr"='الطاقة الشمسية والكهروضوئية', url='/industries/solar-photovoltaic' WHERE id=148;
UPDATE menu SET name='氢能', "nameEn"='Hydrogen Energy', "nameJa"='水素エネルギー', "nameKo"='수소 에너지', "nameFr"='Énergie hydrogène', "nameAr"='طاقة الهيدروجين', url='/industries/hydrogen-energy' WHERE id=149;
UPDATE menu SET name='科研实验室', "nameEn"='Research Laboratories', "nameJa"='研究・実験室', "nameKo"='연구소', "nameFr"='Laboratoires de recherche', "nameAr"='مختبرات الأبحاث', url='/industries/research-labs' WHERE id=150;

-- ========== 服务支持子项：替换为实际 4 服务（名称多语种 + url 修复） ==========
UPDATE menu SET name='定制加工', "nameEn"='Custom Manufacturing', "nameJa"='カスタム製造', "nameKo"='맞춤 제조', "nameFr"='Fabrication sur mesure', "nameAr"='التصنيع المخصص', url='/services/custom-manufacturing' WHERE id=153;
UPDATE menu SET "nameJa"='技術サポート', "nameKo"='기술 지원', "nameFr"='Support technique', "nameAr"='الدعم الفني' WHERE id=154;
UPDATE menu SET name='维护与备件', "nameEn"='Maintenance & Spare Parts', "nameJa"='メンテナンスと部品', "nameKo"='유지보수 및 예비 부품', "nameFr"='Maintenance et pièces de rechange', "nameAr"='الصيانة وقطع الغيار', url='/services/maintenance-service' WHERE id=155;
UPDATE menu SET name='培训与咨询', "nameEn"='Training & Consulting', "nameJa"='トレーニングとコンサルティング', "nameKo"='교육 및 컨설팅', "nameFr"='Formation et conseil', "nameAr"='التدريب والاستشارات', url='/services/training-consulting' WHERE id=156;

-- ========== 关于我们子项：culture 软404 替换为 honors ==========
UPDATE menu SET "nameJa"='会社概要', "nameKo"='회사 소개', "nameFr"='Profil de l''entreprise', "nameAr"='نبذة عن الشركة' WHERE id=159;
UPDATE menu SET name='资质荣誉', "nameEn"='Honors', "nameJa"='受賞・認定', "nameKo"='수상·인증', "nameFr"='Distinctions et certifications', "nameAr"='الجوائز والشهادات', url='/about/honors' WHERE id=160;
UPDATE menu SET "nameJa"='発展の歴史', "nameKo"='발전 연혁', "nameFr"='Historique', "nameAr"='التاريخ' WHERE id=161;

-- ========== 新增：资源中心（顶级）+ 3 子项、人才招聘（顶级） ==========
INSERT INTO menu (id, name, "nameEn", "nameJa", "nameKo", "nameFr", "nameAr", url, "parentId", "sortOrder", "isActive", "updatedAt")
VALUES (163, '资源中心', 'Resources', 'リソースセンター', '리소스 센터', 'Centre de ressources', 'مركز الموارد', '/resources', NULL, 6, true, CURRENT_TIMESTAMP);

INSERT INTO menu (id, name, "nameEn", "nameJa", "nameKo", "nameFr", "nameAr", url, "parentId", "sortOrder", "isActive", "updatedAt")
VALUES
 (165, '产品手册', 'Product Manual', '製品マニュアル', '제품 매뉴얼', 'Manuel produit', 'دليل المنتج', '/resources/manual', 163, 1, true, CURRENT_TIMESTAMP),
 (166, '认证证书', 'Certification', '認証書', '인증서', 'Certification', 'شهادة الاعتماد', '/resources/certificate', 163, 2, true, CURRENT_TIMESTAMP),
 (167, '图纸下载', 'Drawings', '図面', '도면', 'Plans', 'الرسومات', '/resources/drawing', 163, 3, true, CURRENT_TIMESTAMP);

INSERT INTO menu (id, name, "nameEn", "nameJa", "nameKo", "nameFr", "nameAr", url, "parentId", "sortOrder", "isActive", "updatedAt")
VALUES (164, '人才招聘', 'Careers', '採用情報', '채용 정보', 'Carrières', 'الوظائف', '/careers', NULL, 8, true, CURRENT_TIMESTAMP);

-- 序列校正（显式 id 插入后）
SELECT setval('menu_id_seq', (SELECT MAX(id) FROM menu));
