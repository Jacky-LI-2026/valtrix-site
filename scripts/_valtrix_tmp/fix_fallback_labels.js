// Header.tsx / Footer.tsx 静态 fallback 标签替换为 t() 字典 key（6 语种）
const fs = require("fs");

const hdr = "D:/阀门网站/components/layout/Header.tsx";
const ftr = "D:/阀门网站/components/layout/Footer.tsx";

const headerRepl = [
  ['label: locale === "en" ? "VCR Face Seal Fittings" : "VCR 面密封接头"', 'label: t("vcrFittings")'],
  ['label: locale === "en" ? "Welded Fittings" : "焊接接头"', 'label: t("weldedFittings")'],
  ['label: locale === "en" ? "Diaphragm Valves" : "隔膜阀"', 'label: t("diaphragmValves")'],
  ['label: locale === "en" ? "Pressure Reducers" : "减压阀"', 'label: t("pressureReducers")'],
  ['label: locale === "en" ? "Check Valves" : "单向阀"', 'label: t("checkValves")'],
  ['label: locale === "en" ? "Gas Filters" : "气体过滤器"', 'label: t("gasFilters")'],
  ['label: locale === "en" ? "Semiconductor" : "半导体制造"', 'label: t("semiconductor")'],
  ['label: locale === "en" ? "Biopharmaceutical" : "生物医药"', 'label: t("biopharmaceutical")'],
  ['label: locale === "en" ? "LED & Display" : "LED显示"', 'label: t("ledDisplay")'],
  ['label: locale === "en" ? "Solar & Photovoltaic" : "光伏"', 'label: t("solar")'],
  ['label: locale === "en" ? "Hydrogen Energy" : "氢能"', 'label: t("hydrogen")'],
  ['label: locale === "en" ? "Research Laboratories" : "科研实验室"', 'label: t("researchLabs")'],
];

const footerRepl = [
  ['{ label: locale === "en" ? "VCR Face Seal Fittings" : "VCR 面密封接头", href: "/products?tab=vcr-fittings" }', '{ label: t("vcrFittings"), href: "/products?tab=vcr-fittings" }'],
  ['{ label: locale === "en" ? "Diaphragm Valves" : "隔膜阀", href: "/products?tab=diaphragm-valves" }', '{ label: t("diaphragmValves"), href: "/products?tab=diaphragm-valves" }'],
  ['{ label: locale === "en" ? "Check Valves" : "单向阀", href: "/products?tab=check-valves" }', '{ label: t("checkValves"), href: "/products?tab=check-valves" }'],
  ['{ label: locale === "en" ? "Gas Filters" : "气体过滤器", href: "/products?tab=filters" }', '{ label: t("gasFilters"), href: "/products?tab=filters" }'],
  ['{ label: locale === "en" ? "Semiconductor" : "半导体制造", href: "/industries/semiconductor" }', '{ label: t("semiconductor"), href: "/industries/semiconductor" }'],
  ['{ label: locale === "en" ? "Biopharmaceutical" : "生物医药", href: "/industries/biopharmaceutical" }', '{ label: t("biopharmaceutical"), href: "/industries/biopharmaceutical" }'],
  ['{ label: locale === "en" ? "LED & Display" : "LED显示", href: "/industries/led-display" }', '{ label: t("ledDisplay"), href: "/industries/led-display" }'],
  ['{ label: locale === "en" ? "Solar & Photovoltaic" : "光伏", href: "/industries/solar-photovoltaic" }', '{ label: t("solar"), href: "/industries/solar-photovoltaic" }'],
  ['{ label: locale === "en" ? "Hydrogen Energy" : "氢能", href: "/industries/hydrogen-energy" }', '{ label: t("hydrogen"), href: "/industries/hydrogen-energy" }'],
  ['{ label: locale === "en" ? "Research Laboratories" : "科研实验室", href: "/industries/research-labs" }', '{ label: t("researchLabs"), href: "/industries/research-labs" }'],
];

function apply(file, repls) {
  let c = fs.readFileSync(file, "utf8");
  let ok = 0, miss = 0;
  for (const [from, to] of repls) {
    if (c.includes(from)) { c = c.split(from).join(to); ok++; }
    else { console.log("MISS:", file, "::", from.slice(0, 80)); miss++; }
  }
  fs.writeFileSync(file, c, "utf8");
  console.log(file, "ok=" + ok, "miss=" + miss);
}

apply(hdr, headerRepl);
apply(ftr, footerRepl);
