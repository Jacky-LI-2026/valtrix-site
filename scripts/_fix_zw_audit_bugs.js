const fs = require('fs');
const R = 'D:/企业网站/';
function rep(rel, oldStr, newStr, tag) {
  let s = fs.readFileSync(R + rel, 'utf8');
  if (!s.includes(oldStr)) { console.log('MISS:', rel, '::', tag); process.exit(1); }
  s = s.replace(oldStr, newStr);
  fs.writeFileSync(R + rel, s);
  console.log('OK :', rel, '::', tag);
}

// H3'. 相关服务保留多语言字段
rep('app/services/[slug]/ServiceDetailClient.tsx',
  'setRelatedServices(rec.map((x: any) => ({ slug: x.slug, title: x.title, subtitle: x.subtitle })));',
  'setRelatedServices(rec.map((x: any) => ({ ...x })));', 'H3 related services');

// M1'. 六处"加载中..."字典化（两种结构）
rep('app/services/[slug]/ServiceDetailClient.tsx', '<div className="text-dark-400">加载中...</div>', '<div className="text-dark-400">{t("loading")}</div>', 'M1 services');
rep('app/about/[section]/AboutSectionClient.tsx', '<div className="text-dark-400">加载中...</div>', '<div className="text-dark-400">{t("loading")}</div>', 'M1 about');
rep('app/careers/[slug]/JobDetailClient.tsx', '<div className="text-dark-400">加载中...</div>', '<div className="text-dark-400">{t("loading")}</div>', 'M1 job detail');
rep('app/industries/[slug]/IndustryDetailClient.tsx', '<div className="text-dark-400">加载中...</div>', '<div className="text-dark-400">{t("loading")}</div>', 'M1 industry detail');
for (const [f, tag] of [['app/careers/page.tsx', 'M1 careers list'], ['app/industries/page.tsx', 'M1 industries list']]) {
  let s = fs.readFileSync(R + f, 'utf8');
  const m = s.match(/<div className="text-center py-[\d]+ text-dark-400">加载中\.\.\.<\/div>/);
  if (!m) { console.log('MISS:', f, '::', tag, 'no match'); process.exit(1); }
  s = s.replace(m[0], m[0].replace('加载中...</div>', '{t("loading")}</div>'));
  fs.writeFileSync(R + f, s);
  console.log('OK :', f, '::', tag);
}

// M2'+M3'. contact 标签去重 + 电话 bidi isolate
rep('app/contact/page.tsx',
`<div className="text-sm text-dark-400 mb-1">{item.label}</div>
                        <div className="text-dark font-medium">{item.value}</div>
                        <div className="text-sm text-dark-400">{item.sub}</div>`,
`<div className="text-sm text-dark-400 mb-1">{item.label}</div>
                        <div className="text-dark font-medium">
                          {/^[+\\d][\\d\\s\\-()]*$/.test(String(item.value)) ? (
                            <span dir="ltr" className="inline-block">{item.value}</span>
                          ) : (
                            item.value
                          )}
                        </div>
                        {item.sub && item.sub !== item.label ? (
                          <div className="text-sm text-dark-400">{item.sub}</div>
                        ) : null}`, 'M2+M3 contact');

// M7'. 服务 not-found 字典化
rep('app/services/[slug]/ServiceDetailClient.tsx', '<h1 className="text-2xl font-bold text-gray-900 mb-4">服务不存在</h1>', '<h1 className="text-2xl font-bold text-gray-900 mb-4">{t("serviceNotFound")}</h1>', 'M7 h1');
rep('app/services/[slug]/ServiceDetailClient.tsx', '返回服务列表', '{t("backToServices")}', 'M7 back');

// i18n 六语种补 serviceNotFound/backToServices
const perLang = {
  zh: { after: 'notFound: "页面未找到",', add: `    serviceNotFound: "服务不存在",
    backToServices: "返回服务列表",` },
  en: { after: 'notFound: "Page Not Found",', add: `    serviceNotFound: "Service Not Found",
    backToServices: "Back to Services",` },
  ja: { after: 'notFound: "ページが見つかりません",', add: `    serviceNotFound: "サービスが見つかりません",
    backToServices: "サービス一覧に戻る",` },
  ko: { after: 'notFound: "페이지를 찾을 수 없음",', add: `    serviceNotFound: "서비스를 찾을 수 없음",
    backToServices: "서비스 목록으로 돌아가기",` },
  fr: { after: 'notFound: "Page non trouvée",', add: `    serviceNotFound: "Service introuvable",
    backToServices: "Retour aux services",` },
  ar: { after: 'notFound: "لم يتم العثور على الصفحة",', add: `    serviceNotFound: "الخدمة غير موجودة",
    backToServices: "العودة إلى قائمة الخدمات",` },
};
let i18n = fs.readFileSync(R + 'config/i18n.ts', 'utf8');
for (const [lang, cfg] of Object.entries(perLang)) {
  if (!i18n.includes(cfg.after)) { console.log('MISS i18n:', lang); process.exit(1); }
  i18n = i18n.split(cfg.after).join(cfg.after + '\n' + cfg.add);
}
fs.writeFileSync(R + 'config/i18n.ts', i18n);
console.log('OK : config/i18n.ts 六语种补 serviceNotFound/backToServices');
console.log('ALL DONE');
