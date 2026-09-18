const fs = require('fs');
const R = 'D:/阀门网站/';
function rep(rel, oldStr, newStr, tag) {
  let s = fs.readFileSync(R + rel, 'utf8');
  if (!s.includes(oldStr)) { console.log('MISS:', rel, '::', tag); process.exit(1); }
  s = s.replace(oldStr, newStr);
  fs.writeFileSync(R + rel, s);
  console.log('OK :', rel, '::', tag);
}
rep('app/careers/page.tsx', '<div className="text-center py-12 text-dark-400">加载中...</div>', '<div className="text-center py-12 text-dark-400">{t("loading")}</div>', 'M1 careers list');
rep('app/industries/page.tsx', '<div className="text-center py-20 text-dark-400">加载中...</div>', '<div className="text-center py-20 text-dark-400">{t("loading")}</div>', 'M1 industries list');
rep('app/careers/[slug]/JobDetailClient.tsx', '<div className="text-dark-400">加载中...</div>', '<div className="text-dark-400">{t("loading")}</div>', 'M1 job detail');
rep('app/industries/[slug]/IndustryDetailClient.tsx', '<div className="text-dark-400">加载中...</div>', '<div className="text-dark-400">{t("loading")}</div>', 'M1 industry detail');

// ===== M2 + M3. contact 标签去重 + ar 电话 bidi isolate =====
rep('app/contact/page.tsx',
`                      <div>
                        <div className="text-sm text-dark-400 mb-1">{item.label}</div>
                        <div className="text-dark font-medium">{item.value}</div>
                        <div className="text-sm text-dark-400">{item.sub}</div>
                      </div>`,
`                      <div>
                        <div className="text-sm text-dark-400 mb-1">{item.label}</div>
                        <div className="text-dark font-medium">
                          {/^[+\\d][\\d\\s\\-()]*$/.test(String(item.value)) ? (
                            <span dir="ltr" className="inline-block">{item.value}</span>
                          ) : (
                            item.value
                          )}
                        </div>
                        {item.sub && item.sub !== item.label ? (
                          <div className="text-sm text-dark-400">{item.sub}</div>
                        ) : null}
                      </div>`, 'M2+M3 contact');

// ===== M7. 服务 not-found 字典化 =====
rep('app/services/[slug]/ServiceDetailClient.tsx', '<h1 className="text-2xl font-bold text-gray-900 mb-4">服务不存在</h1>', '<h1 className="text-2xl font-bold text-gray-900 mb-4">{t("serviceNotFound")}</h1>', 'M7 h1');
rep('app/services/[slug]/ServiceDetailClient.tsx', '返回服务列表', '{t("backToServices")}', 'M7 back');

// ===== L5. Header 菜单 desc 字典化 =====
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "Selection & installation" : "选型与安装指导"', 'desc: t("menuTechDesc")', 'menuTech');
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "Custom UHP processing" : "超高纯定制加工"', 'desc: t("menuOdmDesc")', 'menuOdm');
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "Repair & parts supply" : "维修保养与备件"', 'desc: t("menuMaintDesc")', 'menuMaint');
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "Training & consulting" : "培训与咨询"', 'desc: t("menuTrainDesc")', 'menuTrain');
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "Tech specs & selection" : "技术参数选型"', 'desc: t("menuCatDesc")', 'menuCat');
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "Qualifications" : "资质认证"', 'desc: t("menuCertDesc")', 'menuCert');
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "2D/3D downloads" : "2D/3D下载"', 'desc: t("menuDrawDesc")', 'menuDraw');
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "Company overview" : "企业概况"', 'desc: t("menuProfileDesc")', 'menuProfile');
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "Awards & certs" : "资质奖项"', 'desc: t("menuHonorsDesc")', 'menuHonors');
rep('components/layout/Header.tsx', 'desc: locale === "en" ? "Milestones" : "成长里程碑"', 'desc: t("menuHistoryDesc")', 'menuHistory');

// ===== config/i18n.ts 六语种补 key =====
const perLang = {
  zh: { after: 'ourHonors: "公司荣誉",', add: `    menuTechDesc: "选型与安装指导",
    menuOdmDesc: "超高纯定制加工",
    menuMaintDesc: "维修保养与备件",
    menuTrainDesc: "培训与咨询",
    menuCatDesc: "技术参数选型",
    menuCertDesc: "资质认证",
    menuDrawDesc: "2D/3D下载",
    menuProfileDesc: "企业概况",
    menuHonorsDesc: "资质奖项",
    menuHistoryDesc: "成长里程碑",`, nfAfter: 'notFound: "页面未找到",', nfAdd: `    serviceNotFound: "服务不存在",
    backToServices: "返回服务列表",` },
  en: { after: 'ourHonors: "Honors",', add: `    menuTechDesc: "Selection & installation",
    menuOdmDesc: "Custom UHP processing",
    menuMaintDesc: "Repair & parts supply",
    menuTrainDesc: "Training & consulting",
    menuCatDesc: "Tech specs & selection",
    menuCertDesc: "Qualifications",
    menuDrawDesc: "2D/3D downloads",
    menuProfileDesc: "Company overview",
    menuHonorsDesc: "Awards & certs",
    menuHistoryDesc: "Milestones",`, nfAfter: 'notFound: "Page Not Found",', nfAdd: `    serviceNotFound: "Service Not Found",
    backToServices: "Back to Services",` },
  ja: { after: 'ourHonors: "栄誉と資格",', add: `    menuTechDesc: "選定と設置ガイド",
    menuOdmDesc: "超高純度カスタム加工",
    menuMaintDesc: "修理・保守と予備部品",
    menuTrainDesc: "トレーニングとコンサルティング",
    menuCatDesc: "技術仕様と選定",
    menuCertDesc: "資格認証",
    menuDrawDesc: "2D/3Dダウンロード",
    menuProfileDesc: "会社概要",
    menuHonorsDesc: "受賞・認証",
    menuHistoryDesc: "成長のマイルストーン",`, nfAfter: 'notFound: "ページが見つかりません",', nfAdd: `    serviceNotFound: "サービスが見つかりません",
    backToServices: "サービス一覧に戻る",` },
  ko: { after: 'ourHonors: "회사 영예",', add: `    menuTechDesc: "선정 및 설치 안내",
    menuOdmDesc: "초고순도 맞춤 가공",
    menuMaintDesc: "수리·보수 및 예비 부품",
    menuTrainDesc: "교육 및 컨설팅",
    menuCatDesc: "기술 사양 및 선정",
    menuCertDesc: "자격 인증",
    menuDrawDesc: "2D/3D 다운로드",
    menuProfileDesc: "회사 소개",
    menuHonorsDesc: "수상 및 인증",
    menuHistoryDesc: "성장 이정표",`, nfAfter: 'notFound: "페이지를 찾을 수 없음",', nfAdd: `    serviceNotFound: "서비스를 찾을 수 없음",
    backToServices: "서비스 목록으로 돌아가기",` },
  fr: { after: "ourHonors: \"Honneur de l'entreprise\",", add: `    menuTechDesc: "Guide de sélection et d'installation",
    menuOdmDesc: "Traitement UHP personnalisé",
    menuMaintDesc: "Réparation et fourniture de pièces",
    menuTrainDesc: "Formation et conseil",
    menuCatDesc: "Spécifications techniques et sélection",
    menuCertDesc: "Qualifications",
    menuDrawDesc: "Téléchargements 2D/3D",
    menuProfileDesc: "Aperçu de l'entreprise",
    menuHonorsDesc: "Prix et certifications",
    menuHistoryDesc: "Jalons",`, nfAfter: 'notFound: "Page non trouvée",', nfAdd: `    serviceNotFound: "Service introuvable",
    backToServices: "Retour aux services",` },
  ar: { after: 'ourHonors: "شرف الشركة",', add: `    menuTechDesc: "دليل الاختيار والتركيب",
    menuOdmDesc: "تصنيع مخصص فائق النقاء",
    menuMaintDesc: "الإصلاح والصيانة وقطع الغيار",
    menuTrainDesc: "التدريب والاستشارات",
    menuCatDesc: "المواصفات الفنية والاختيار",
    menuCertDesc: "الشهادات",
    menuDrawDesc: "تنزيلات 2D/3D",
    menuProfileDesc: "نظرة عامة على الشركة",
    menuHonorsDesc: "الجوائز والشهادات",
    menuHistoryDesc: "معالم النمو",`, nfAfter: 'notFound: "لم يتم العثور على الصفحة",', nfAdd: `    serviceNotFound: "الخدمة غير موجودة",
    backToServices: "العودة إلى قائمة الخدمات",` },
};
let i18n = fs.readFileSync(R + 'config/i18n.ts', 'utf8');
for (const [lang, cfg] of Object.entries(perLang)) {
  if (!i18n.includes(cfg.after)) { console.log('MISS i18n:', lang, JSON.stringify(cfg.after)); process.exit(1); }
  i18n = i18n.split(cfg.after).join(cfg.after + '\n' + cfg.add);
  if (!i18n.includes(cfg.nfAfter)) { console.log('MISS i18n nf:', lang); process.exit(1); }
  i18n = i18n.split(cfg.nfAfter).join(cfg.nfAfter + '\n' + cfg.nfAdd);
}
fs.writeFileSync(R + 'config/i18n.ts', i18n);
console.log('OK : config/i18n.ts 六语种补 key');
console.log('ALL DONE');
