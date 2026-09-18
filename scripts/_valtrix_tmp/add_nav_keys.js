// 为 config/i18n.ts 六个语种字典新增 12 个产品/行业导航 key（插在 drawings 行之后）
const fs = require("fs");
const p = "D:/阀门网站/config/i18n.ts";
let c = fs.readFileSync(p, "utf8");

const blocks = {
  zh: [
    '    vcrFittings: "VCR面密封接头",',
    '    weldedFittings: "焊接接头",',
    '    diaphragmValves: "隔膜阀",',
    '    pressureReducers: "减压阀",',
    '    checkValves: "单向阀",',
    '    gasFilters: "气体过滤器",',
    '    semiconductor: "半导体制造",',
    '    biopharmaceutical: "生物医药",',
    '    ledDisplay: "LED显示",',
    '    solar: "光伏",',
    '    hydrogen: "氢能",',
    '    researchLabs: "科研实验室",',
  ],
  en: [
    '    vcrFittings: "VCR Face Seal Fittings",',
    '    weldedFittings: "Welded Fittings",',
    '    diaphragmValves: "Diaphragm Valves",',
    '    pressureReducers: "Pressure Reducers",',
    '    checkValves: "Check Valves",',
    '    gasFilters: "Gas Filters",',
    '    semiconductor: "Semiconductor Manufacturing",',
    '    biopharmaceutical: "Biopharmaceutical",',
    '    ledDisplay: "LED & Display",',
    '    solar: "Solar & Photovoltaic",',
    '    hydrogen: "Hydrogen Energy",',
    '    researchLabs: "Research Laboratories",',
  ],
  ja: [
    '    vcrFittings: "VCR面シール継手",',
    '    weldedFittings: "溶接継手",',
    '    diaphragmValves: "ダイヤフラムバルブ",',
    '    pressureReducers: "減圧弁",',
    '    checkValves: "逆止弁",',
    '    gasFilters: "ガスフィルター",',
    '    semiconductor: "半導体製造",',
    '    biopharmaceutical: "バイオ医薬品",',
    '    ledDisplay: "LED・ディスプレイ",',
    '    solar: "ソーラー・太陽光発電",',
    '    hydrogen: "水素エネルギー",',
    '    researchLabs: "研究・実験室",',
  ],
  ko: [
    '    vcrFittings: "VCR 페이스 씰 피팅",',
    '    weldedFittings: "용접 피팅",',
    '    diaphragmValves: "다이어프램 밸브",',
    '    pressureReducers: "감압 밸브",',
    '    checkValves: "체크 밸브",',
    '    gasFilters: "가스 필터",',
    '    semiconductor: "반도체 제조",',
    '    biopharmaceutical: "바이오의약",',
    '    ledDisplay: "LED·디스플레이",',
    '    solar: "태양광·광전지",',
    '    hydrogen: "수소 에너지",',
    '    researchLabs: "연구소",',
  ],
  fr: [
    '    vcrFittings: "Raccords à joint de face VCR",',
    '    weldedFittings: "Raccords soudés",',
    '    diaphragmValves: "Vannes à membrane",',
    '    pressureReducers: "Détendeurs de pression",',
    '    checkValves: "Clapets antiretour",',
    '    gasFilters: "Filtres à gaz",',
    '    semiconductor: "Fabrication de semi-conducteurs",',
    '    biopharmaceutical: "Biopharmaceutique",',
    '    ledDisplay: "LED et affichage",',
    '    solar: "Solaire et photovoltaïque",',
    '    hydrogen: "Énergie hydrogène",',
    '    researchLabs: "Laboratoires de recherche",',
  ],
  ar: [
    '    vcrFittings: "وصلات ختم سطح VCR",',
    '    weldedFittings: "وصلات ملحومة",',
    '    diaphragmValves: "صمامات الحجاب الحاجز",',
    '    pressureReducers: "صمامات تخفيض الضغط",',
    '    checkValves: "صمامات عدم الرجوع",',
    '    gasFilters: "مرشحات الغاز",',
    '    semiconductor: "تصنيع أشباه الموصلات",',
    '    biopharmaceutical: "الصناعات الدوائية الحيوية",',
    '    ledDisplay: "LED والعرض",',
    '    solar: "الطاقة الشمسية والكهروضوئية",',
    '    hydrogen: "طاقة الهيدروجين",',
    '    researchLabs: "مختبرات الأبحاث",',
  ],
};

const anchors = [
  { key: "drawings", val: '"图纸"' },
  { key: "drawings", val: '"Drawings"' },
  { key: "drawings", val: '"図面"' },
  { key: "drawings", val: '"도면"' },
  { key: "drawings", val: '"Dessins"' },
  { key: "drawings", val: '"رسم"' },
];

for (const [loc, lines] of Object.entries(blocks)) {
  const a = anchors.find((x) => x.key === "drawings" && c.includes(x.val));
  if (!a) { console.error("anchor not found for", loc); process.exit(1); }
  const anchorLine = `    drawings: ${a.val},`;
  if (!c.includes(anchorLine)) { console.error("anchor line missing:", anchorLine); process.exit(1); }
  // 检查是否已插入过（防重跑）
  if (c.includes(`    vcrFittings: `) && c.includes(`    researchLabs: `)) {
    console.log("keys already present, skip"); process.exit(0);
  }
}

// 逐语种插入：匹配该语种 drawings 行（用行内容区分）
const insertions = [
  { after: '    drawings: "图纸",', block: blocks.zh },
  { after: '    drawings: "Drawings",', block: blocks.en },
  { after: '    drawings: "図面",', block: blocks.ja },
  { after: '    drawings: "도면",', block: blocks.ko },
  { after: '    drawings: "Dessins",', block: blocks.fr },
  { after: '    drawings: "رسم",', block: blocks.ar },
];

for (const ins of insertions) {
  if (!c.includes(ins.after)) { console.error("missing anchor:", ins.after); process.exit(1); }
  const added = "\n" + ins.block.join("\n");
  c = c.replace(ins.after, ins.after + added);
}

fs.writeFileSync(p, c, "utf8");
console.log("OK inserted 12 keys x6 locales");
