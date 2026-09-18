// 一次性修复脚本：VALTRIX 站多语言硬编码 8 类问题（2026-09-09）
// 运行：node scripts/_fix_ml_hardcode.js
//
// ⚠️ 2026-09-15 退役说明：本脚本的模板里原本写着一个**占位电话号码**（`+86 577-…`），
//    它会把这个假号**重新写回**前台的 `contactData?.phone || "<假号>"` 兜底位置。
//    该假号已从代码与数据库中清除（G2：不得写死他站/占位联系方式），
//    故已把模板里的号码一并抹除 —— 现在再跑本脚本只会产生**空兜底**，不再回灌假数据。
//    若还需跑，请先确认它不会覆盖今天已修好的文件。
const fs = require("fs");
const path = require("path");

const ROOT = "D:\\阀门网站";
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }
function write(p, s) { fs.writeFileSync(path.join(ROOT, p), s, "utf8"); }

let fail = 0;
function rep(file, oldS, newS, { all = false, must = true } = {}) {
  let s = read(file);
  const count = s.split(oldS).length - 1;
  if (count === 0) {
    if (must) { console.log(`[FAIL] ${file}: 未找到目标片段: ${oldS.slice(0, 60).replace(/\n/g, "\\n")}`); fail++; return; }
    console.log(`[SKIP] ${file}: ${oldS.slice(0, 40).replace(/\n/g, "\\n")}`); return;
  }
  s = all ? s.split(oldS).join(newS) : s.replace(oldS, newS);
  write(file, s);
  console.log(`[ OK ] ${file} (x${count})`);
}

// ========== 1. config/i18n.ts 新增 21 个 key（六语种） ==========
const NEW_KEYS = {
  zh: `    statsProductSeries: "产品系列",
    statsIndustriesServed: "服务行业",
    statsAnnualOutput: "年产量",
    statsGlobalClients: "全球客户",
    navDescVcrFittings: "G 系列，金属面密封",
    navDescWeldedFittings: "微焊接 I 系列",
    navDescDiaphragmValves: "手动、气动系列",
    navDescPressureReducers: "金属膜片减压",
    navDescCheckValves: "全焊接、计量型",
    navDescGasFilters: "烧结、陶瓷滤芯",
    navDescSemiconductor: "晶圆厂超高纯流体制程",
    navDescBiopharma: "可清洗可排空的流体系统",
    navDescLed: "外延与薄膜制程精密气体控制",
    navDescSolar: "高可靠性流体元件",
    navDescHydrogen: "氢系统防漏元件",
    navDescResearch: "研发与中试气体系统",
    language: "语言",
    newsNotFound: "页面不存在",
    modelDrawings: "模型图纸",
    downloadFile: "下载文件",
    noManual: "暂无资料",
`,
  en: `    statsProductSeries: "Product Series",
    statsIndustriesServed: "Industries Served",
    statsAnnualOutput: "Annual Output",
    statsGlobalClients: "Global Clients",
    navDescVcrFittings: "G series, metal face seal",
    navDescWeldedFittings: "Micro welded I series",
    navDescDiaphragmValves: "Manual & pneumatic",
    navDescPressureReducers: "Metal diaphragm reducers",
    navDescCheckValves: "All-welded & metering",
    navDescGasFilters: "Sintered & ceramic",
    navDescSemiconductor: "Ultra-high-purity fluid control for wafer fabs",
    navDescBiopharma: "Cleanable, drainable fluid systems",
    navDescLed: "Precise gas control for epitaxy",
    navDescSolar: "High-reliability fluid components",
    navDescHydrogen: "Leak-tight components for hydrogen",
    navDescResearch: "Reliable gas systems for R&D",
    language: "Language",
    newsNotFound: "Page not found",
    modelDrawings: "Model Drawings",
    downloadFile: "Download File",
    noManual: "No materials available",
`,
  ja: `    statsProductSeries: "製品シリーズ",
    statsIndustriesServed: "対応業界",
    statsAnnualOutput: "年間生産量",
    statsGlobalClients: "世界中のお客様",
    navDescVcrFittings: "Gシリーズ、メタルフェイスシール",
    navDescWeldedFittings: "マイクロ溶接Iシリーズ",
    navDescDiaphragmValves: "手動・空圧シリーズ",
    navDescPressureReducers: "金属ダイヤフラム減圧",
    navDescCheckValves: "全溶接・計量型",
    navDescGasFilters: "焼結・セラミックフィルター",
    navDescSemiconductor: "ウェーハ工場の超高純度流体プロセス",
    navDescBiopharma: "洗浄・排水可能な流体システム",
    navDescLed: "エピタキシャル・薄膜プロセスの精密ガス制御",
    navDescSolar: "高信頼性流体部品",
    navDescHydrogen: "水素システムの防漏部品",
    navDescResearch: "研究・パイロット向けガスシステム",
    language: "言語",
    newsNotFound: "ページが見つかりません",
    modelDrawings: "モデル図面",
    downloadFile: "ファイルをダウンロード",
    noManual: "資料がありません",
`,
  ko: `    statsProductSeries: "제품 시리즈",
    statsIndustriesServed: "서비스 산업",
    statsAnnualOutput: "연간 생산량",
    statsGlobalClients: "글로벌 고객",
    navDescVcrFittings: "G 시리즈, 메탈 페이스 실",
    navDescWeldedFittings: "마이크로 용접 I 시리즈",
    navDescDiaphragmValves: "수동·공압 시리즈",
    navDescPressureReducers: "금속 다이어프램 감압",
    navDescCheckValves: "전용접·계량형",
    navDescGasFilters: "소결·세라믹 필터",
    navDescSemiconductor: "웨이퍼 팹 초고순도 유체 공정",
    navDescBiopharma: "세척·배출 가능한 유체 시스템",
    navDescLed: "에피택시 및 박막 공정 정밀 가스 제어",
    navDescSolar: "고신뢰성 유체 부품",
    navDescHydrogen: "수소 시스템 방누수 부품",
    navDescResearch: "연구·파일럿 가스 시스템",
    language: "언어",
    newsNotFound: "페이지를 찾을 수 없습니다",
    modelDrawings: "모델 도면",
    downloadFile: "파일 다운로드",
    noManual: "자료가 없습니다",
`,
  fr: `    statsProductSeries: "Gamme de produits",
    statsIndustriesServed: "Industries servies",
    statsAnnualOutput: "Production annuelle",
    statsGlobalClients: "Clients mondiaux",
    navDescVcrFittings: "Série G, joint à face métallique",
    navDescWeldedFittings: "Série I micro-soudée",
    navDescDiaphragmValves: "Manuel et pneumatique",
    navDescPressureReducers: "Détendeurs à membrane métallique",
    navDescCheckValves: "Tout soudé et de comptage",
    navDescGasFilters: "Filtres frittés et céramiques",
    navDescSemiconductor: "Contrôle de fluides ultra-haute pureté pour les fab de wafers",
    navDescBiopharma: "Systèmes de fluides nettoyables et vidangeables",
    navDescLed: "Contrôle précis du gaz pour l'épitaxie",
    navDescSolar: "Composants fluidiques haute fiabilité",
    navDescHydrogen: "Composants étanches pour l'hydrogène",
    navDescResearch: "Systèmes de gaz fiables pour la R&D",
    language: "Langue",
    newsNotFound: "Page introuvable",
    modelDrawings: "Dessins de modèle",
    downloadFile: "Télécharger le fichier",
    noManual: "Aucun document disponible",
`,
  ar: `    statsProductSeries: "سلسلة المنتجات",
    statsIndustriesServed: "القطاعات الخدمية",
    statsAnnualOutput: "الإنتاج السنوي",
    statsGlobalClients: "العملاء العالميون",
    navDescVcrFittings: "السلسلة G، ختم سطحي معدني",
    navDescWeldedFittings: "السلسلة I الملحومة الدقيقة",
    navDescDiaphragmValves: "يدوي وهوائي",
    navDescPressureReducers: "مخفضات ضغط بغشاء معدني",
    navDescCheckValves: "ملحومة بالكامل وقياس",
    navDescGasFilters: "مرشحات ملبدّة وسيراميكية",
    navDescSemiconductor: "التحكم في السوائل فائقة النقاء لمصانع الرقائق",
    navDescBiopharma: "أنظمة سوائل قابلة للتنظيف والتفريغ",
    navDescLed: "تحكم دقيق بالغاز لعمليات الترسيب",
    navDescSolar: "مكونات سوائل عالية الموثوقية",
    navDescHydrogen: "مكونات مانعة للتسرب للهيدروجين",
    navDescResearch: "أنظمة غاز موثوقة للبحث والتطوير",
    language: "اللغة",
    newsNotFound: "الصفحة غير موجودة",
    modelDrawings: "رسومات النموذج",
    downloadFile: "تنزيل الملف",
    noManual: "لا توجد مواد",
`,
};
for (const lang of ["zh", "en", "ja", "ko", "fr", "ar"]) {
  rep("config/i18n.ts", `  ${lang}: {`, `  ${lang}: {\n${NEW_KEYS[lang]}`, { must: true });
}

// ========== 2. Hero.tsx 统计标签 → t() ==========
rep("components/sections/Hero.tsx",
`  const defaultStats = [
    { value: "6", label: locale === "en" ? "Product Series" : "产品系列" },
    { value: "20+", label: locale === "en" ? "Industries Served" : "服务行业" },
    { value: "50000", label: locale === "en" ? "Annual Output" : "年产量" },
    { value: "3000+", label: locale === "en" ? "Global Customers" : "全球客户" },
  ];`,
`  const defaultStats = [
    { value: "6", label: t("statsProductSeries") },
    { value: "20+", label: t("statsIndustriesServed") },
    { value: "50000", label: t("statsAnnualOutput") },
    { value: "3000+", label: t("statsGlobalClients") },
  ];`);

// ========== 3. Header.tsx 导航 hover 描述 12 处 → t() ==========
rep("components/layout/Header.tsx", `desc: locale === "en" ? "G series, metal face seal" : "G 系列，金属面密封"`, `desc: t("navDescVcrFittings")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "Micro welded I series" : "微焊接 I 系列"`, `desc: t("navDescWeldedFittings")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "Manual & pneumatic" : "手动、气动系列"`, `desc: t("navDescDiaphragmValves")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "Metal diaphragm reducers" : "金属膜片减压"`, `desc: t("navDescPressureReducers")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "All-welded & metering" : "全焊接、计量型"`, `desc: t("navDescCheckValves")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "Sintered & ceramic" : "烧结、陶瓷滤芯"`, `desc: t("navDescGasFilters")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "Ultra-high-purity fluid control for wafer fabs" : "晶圆厂超高纯流体制程"`, `desc: t("navDescSemiconductor")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "Cleanable, drainable fluid systems" : "可清洗可排空的流体系统"`, `desc: t("navDescBiopharma")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "Precise gas control for epitaxy" : "外延与薄膜制程精密气体控制"`, `desc: t("navDescLed")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "High-reliability fluid components" : "高可靠性流体元件"`, `desc: t("navDescSolar")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "Leak-tight components for hydrogen" : "氢系统防漏元件"`, `desc: t("navDescHydrogen")`);
rep("components/layout/Header.tsx", `desc: locale === "en" ? "Reliable gas systems for R&D" : "研发与中试气体系统"`, `desc: t("navDescResearch")`);

// ========== 4. Header.tsx 移动端语言标签 → t() ==========
rep("components/layout/Header.tsx", `{locale === "en" ? "Language" : "语言"}`, `{t("language")}`);

// ========== 5. Industries.tsx 英文副标题仅 zh 显示 ==========
rep("components/sections/Industries.tsx", `  const isEn = locale === "en";\n`, "");
rep("components/sections/Industries.tsx", `{!isEn && industry.nameEn}`, `{locale === "zh" && industry.nameEn}`);

// ========== 6. 加载态/404 文案 → t() ==========
rep("app/news/[slug]/NewsDetailClient.tsx", `<div className="text-dark-400">加载中...</div>`, `<div className="text-dark-400">{t("loading")}</div>`);
rep("app/news/[slug]/NewsDetailClient.tsx", `<p className="text-dark-400 mb-6">页面不存在</p>`, `<p className="text-dark-400 mb-6">{t("newsNotFound")}</p>`);
rep("app/news/[slug]/NewsDetailClient.tsx", `<Link href="/news" className="text-primary hover:underline">返回新闻列表</Link>`, `<Link href="/news" className="text-primary hover:underline">{t("backToNews")}</Link>`);
rep("app/about/page.tsx", `<div className="text-dark-400">加载中...</div>`, `<div className="text-dark-400">{t("loading")}</div>`);
rep("app/faqs/page.tsx", `<div className="text-center py-20 text-dark-400">加载中...</div>`, `<div className="text-center py-20 text-dark-400">{t("loading")}</div>`);
rep("app/news/page.tsx", `<div className="text-center py-20 text-dark-400">加载中...</div>`, `<div className="text-center py-20 text-dark-400">{t("loading")}</div>`);
rep("app/services/page.tsx", `<div className="text-dark-400">加载中...</div>`, `<div className="text-dark-400">{t("loading")}</div>`);
rep("app/resources/page.tsx", `<div className="text-center py-20 text-dark-400">加载中...</div>`, `<div className="text-center py-20 text-dark-400">{t("loading")}</div>`);
rep("app/resources/[type]/page.tsx", `<div className="text-dark-400">加载中...</div>`, `<div className="text-dark-400">{t("loading")}</div>`);
rep("app/cases/page.tsx", `<div className="text-center py-20 text-dark-400">加载中...</div>`, `<div className="text-center py-20 text-dark-400">{t("loading")}</div>`);
rep("app/cases/[slug]/page.tsx", `return <div className="min-h-[60vh] flex items-center justify-center text-dark-400">加载中...</div>;`, `return <div className="min-h-[60vh] flex items-center justify-center text-dark-400">{t("loading")}</div>;`);

// ========== 7. contact/page.tsx 标签去重（sub 置空） ==========
rep("app/contact/page.tsx",
`  const defaultContactInfo = [
    { icon: Phone, label: t("phone"), value: "", sub: t("phone") },
    { icon: Mail, label: t("email"), value: "sales@valtrix.com", sub: t("email") },
    { icon: MapPin, label: t("address"), value: t("address"), sub: t("address") },
    { icon: Clock, label: t("businessHours"), value: t("businessHours"), sub: t("businessHours") },
  ];`,
`  const defaultContactInfo = [
    { icon: Phone, label: t("phone"), value: "", sub: "" },
    { icon: Mail, label: t("email"), value: "sales@valtrix.com", sub: "" },
    { icon: MapPin, label: t("address"), value: t("address"), sub: "" },
    { icon: Clock, label: t("businessHours"), value: t("businessHours"), sub: "" },
  ];`);

// ========== 8. contact/page.tsx 电话/邮箱 RTL → bdi ==========
rep("app/contact/page.tsx",
`                            {/^[+\\d][\\d\\s\\-()]*$/.test(String(item.value)) ? (
                              <span dir="ltr" className="inline-block">{item.value}</span>
                            ) : (
                              item.value
                            )}`,
`                            {/^[+\\d][\\d\\s\\-()]*$/.test(String(item.value)) || String(item.value).includes("@") ? (
                              <bdi dir="ltr" className="inline-block">{item.value}</bdi>
                            ) : (
                              item.value
                            )}`);

// ========== 9. ProductDetailClient.tsx：手册路径 + HEAD 检测 + 按钮隐藏 + bdi ==========
rep("app/products/[tab]/[id]/ProductDetailClient.tsx",
`const DEFAULT_MANUAL_URL = "/downloads/valve-tech-product-manual.pdf";`,
`const DEFAULT_MANUAL_URL = "/downloads/valtrix-product-catalog-2026.pdf";`);
rep("app/products/[tab]/[id]/ProductDetailClient.tsx",
`  const [contactData, setContactData] = useState<any>(null); // 鼠标在图片上的相对位置(0-1)`,
`  const [contactData, setContactData] = useState<any>(null); // 鼠标在图片上的相对位置(0-1)
  const [manualOk, setManualOk] = useState<boolean | null>(null); // 产品手册文件是否存在（HEAD 检测）`);
rep("app/products/[tab]/[id]/ProductDetailClient.tsx",
`  // 全局鼠标up事件
  useEffect(() => {
    if (isDragging) {
      const globalMouseUp = () => handleDragEnd();
      window.addEventListener("mouseup", globalMouseUp);
      return () => window.removeEventListener("mouseup", globalMouseUp);
    }
  }, [isDragging, handleDragEnd]);`,
`  // 全局鼠标up事件
  useEffect(() => {
    if (isDragging) {
      const globalMouseUp = () => handleDragEnd();
      window.addEventListener("mouseup", globalMouseUp);
      return () => window.removeEventListener("mouseup", globalMouseUp);
    }
  }, [isDragging, handleDragEnd]);

  // 检测产品手册 PDF 是否存在（HEAD），不存在则隐藏下载按钮显示"暂无资料"
  useEffect(() => {
    let cancelled = false;
    const url = model?.manualUrl || DEFAULT_MANUAL_URL;
    if (!url) { setManualOk(false); return; }
    fetch(url, { method: "HEAD" })
      .then((r) => { if (!cancelled) setManualOk(r.ok); })
      .catch(() => { if (!cancelled) setManualOk(false); });
    return () => { cancelled = true; };
  }, [model?.id, model?.manualUrl]);`);
rep("app/products/[tab]/[id]/ProductDetailClient.tsx",
`              {/* Manual Download - All products */}
              <div className="mb-8">
                <DownloadGateButton
                  href={manualUrl}
                  resourceName={\`\${loc.get(model, "name")} (\${model.model})\`}
                  openInNewTab
                  track={{ type: "manual" }}
                  className="inline-flex items-center gap-3 bg-dark-50 hover:bg-dark-100 border-2 border-dark-200 hover:border-primary text-dark-700 hover:text-primary px-6 py-3.5 rounded-lg font-medium transition-all group w-full sm:w-auto"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="text-start flex-1">
                    <div className="font-bold">{t("downloadProductManual")}</div>
                    <div className="text-xs text-dark-400">{t("pdfFormatSpecs")}</div>
                  </div>
                  <Download size={20} className="ms-2 group-hover:translate-y-0.5 transition-transform" />
                </DownloadGateButton>
              </div>`,
`              {/* Manual Download - All products */}
              <div className="mb-8">
                {manualOk === false ? (
                  <div className="inline-flex items-center gap-3 bg-dark-50 border-2 border-dashed border-dark-200 text-dark-400 px-6 py-3.5 rounded-lg w-full sm:w-auto">
                    <FileText size={20} className="text-primary/50 shrink-0" />
                    <span>{t("noManual")}</span>
                  </div>
                ) : (
                <DownloadGateButton
                  href={manualUrl}
                  resourceName={\`\${loc.get(model, "name")} (\${model.model})\`}
                  openInNewTab
                  track={{ type: "manual" }}
                  className="inline-flex items-center gap-3 bg-dark-50 hover:bg-dark-100 border-2 border-dark-200 hover:border-primary text-dark-700 hover:text-primary px-6 py-3.5 rounded-lg font-medium transition-all group w-full sm:w-auto"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="text-start flex-1">
                    <div className="font-bold">{t("downloadProductManual")}</div>
                    <div className="text-xs text-dark-400">{t("pdfFormatSpecs")}</div>
                  </div>
                  <Download size={20} className="ms-2 group-hover:translate-y-0.5 transition-transform" />
                </DownloadGateButton>
                )}
              </div>`);
rep("app/products/[tab]/[id]/ProductDetailClient.tsx",
`                    <Phone size={18} className="text-primary" />
                    <span>{contactData?.phone || ""}</span>`,
`                    <Phone size={18} className="text-primary" />
                    <bdi dir="ltr">{contactData?.phone || ""}</bdi>`);
rep("app/products/[tab]/[id]/ProductDetailClient.tsx",
`                    <Mail size={18} className="text-primary" />
                    <span>{contactData?.email || "sales@valtrix.com"}</span>`,
`                    <Mail size={18} className="text-primary" />
                    <bdi dir="ltr">{contactData?.email || "sales@valtrix.com"}</bdi>`);

// ========== 10. CTA.tsx / Footer.tsx / ServiceDetailClient.tsx RTL → bdi ==========
rep("components/sections/CTA.tsx",
`              <Phone size={18} />
              {phone}
            </a>`,
`              <Phone size={18} />
              <bdi dir="ltr">{phone}</bdi>
            </a>`);
rep("components/layout/Footer.tsx",
`                <Phone className="h-4 w-4 text-primary" />
                {contactData?.phone || ""}`,
`                <Phone className="h-4 w-4 text-primary" />
                <bdi dir="ltr">{contactData?.phone || ""}</bdi>`);
rep("components/layout/Footer.tsx",
`                <Mail className="h-4 w-4 text-primary" />
                {contactData?.email || "sales@valtrix.com"}`,
`                <Mail className="h-4 w-4 text-primary" />
                <bdi dir="ltr">{contactData?.email || "sales@valtrix.com"}</bdi>`);
rep("app/services/[slug]/ServiceDetailClient.tsx",
`                      <p className="text-xs text-gray-500">{t("phone")}</p>
                      <p className="text-sm font-medium text-gray-900"></p>`,
`                      <p className="text-xs text-gray-500">{t("phone")}</p>
                      <p className="text-sm font-medium text-gray-900"><bdi dir="ltr"></bdi></p>`);
rep("app/services/[slug]/ServiceDetailClient.tsx",
`                      <p className="text-xs text-gray-500">{t("email")}</p>
                      <p className="text-sm font-medium text-gray-900">{contactData?.email || "sales@valtrix.com"}</p>`,
`                      <p className="text-xs text-gray-500">{t("email")}</p>
                      <p className="text-sm font-medium text-gray-900"><bdi dir="ltr">{contactData?.email || "sales@valtrix.com"}</bdi></p>`);

console.log(fail === 0 ? "\n=== 全部替换成功 ===" : `\n=== ${fail} 处替换失败 ==="`);
process.exit(fail === 0 ? 0 : 1);
