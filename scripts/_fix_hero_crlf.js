// 修复 Hero.tsx defaultStats（CRLF 行尾）
const fs = require("fs");
const p = "D:/阀门网站/components/sections/Hero.tsx";
let s = fs.readFileSync(p, "utf8");
const oldS = [
  '  const defaultStats = [',
  '    { value: "6", label: locale === "en" ? "Product Series" : "产品系列" },',
  '    { value: "20+", label: locale === "en" ? "Industries Served" : "服务行业" },',
  '    { value: "50000", label: locale === "en" ? "Annual Output" : "年产量" },',
  '    { value: "3000+", label: locale === "en" ? "Global Customers" : "全球客户" },',
  '  ];',
].join("\r\n");
const newS = [
  '  const defaultStats = [',
  '    { value: "6", label: t("statsProductSeries") },',
  '    { value: "20+", label: t("statsIndustriesServed") },',
  '    { value: "50000", label: t("statsAnnualOutput") },',
  '    { value: "3000+", label: t("statsGlobalClients") },',
  '  ];',
].join("\r\n");
const n = s.split(oldS).length - 1;
if (n !== 1) { console.error("match count = " + n); process.exit(1); }
fs.writeFileSync(p, s.replace(oldS, newS), "utf8");
console.log("Hero.tsx replaced OK");
