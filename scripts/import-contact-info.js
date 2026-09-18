// 🔴 2026-09-15 站点保护（必须有）：本脚本会把 `contact_info` **整体覆盖**成「左文科技」的数据
//    （北京市经开区… / info@zuowentech.com / +86 177-2281-3298）。
//    它是**左文站的一次性脚本**，却被复制进了阀门仓 —— 在阀门站执行会把本站联系信息
//    **直接污染成别家公司**的（G2 明令禁止的正是这种"把客户引到别家"的后果）。
//    ⇒ 现改为**必须显式授权**才允许运行：设置 `ALLOW_ZUOWEN_CONTACT_IMPORT=1`。
//       未设置时**直接拒绝退出**（默认安全），并打印原因与正确用法。
const ALLOW = process.env.ALLOW_ZUOWEN_CONTACT_IMPORT === "1";

// ⚠️ 闸门必须在**任何 require / PrismaClient 实例化之前**：
//    放在 main() 里时，模块顶层的 `new PrismaClient()` 会先执行；
//    本地未 `prisma generate` 时它直接抛错，**还没走到闸门就崩了** —— 实测如此，
//    等于"闸门无法自证"。现在移到最前，未授权时**在建库连接之前**就拒绝退出。
if (!ALLOW) {
  console.error("❌ 已阻止执行：本脚本会把 site_config.contact_info 覆盖成「左文科技」的数据");
  console.error("   （北京地址 / info@zuowentech.com / +86 177-2281-3298）。");
  console.error("");
  console.error("   它只应在**左文站**使用。阀门站请勿运行 —— 会把本站联系方式污染成别家公司的。");
  console.error("");
  console.error("   若确属左文站且确实要执行，请显式授权后再跑：");
  console.error("       PowerShell:  $env:ALLOW_ZUOWEN_CONTACT_IMPORT='1'; node scripts/import-contact-info.js");
  process.exit(1);
}
console.warn("⚠️ 已授权运行：即将把 contact_info 覆盖为「左文科技」的数据。");

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contactInfo = {
    phone: "+86 177-2281-3298",
    phoneEn: "+86 177-2281-3298",
    email: "info@zuowentech.com",
    address: "北京市经开区科创十三街29号院一区2号楼8层801-05",
    addressEn: "8F, Bldg 2, Yard 1, No.29 Kechuang 13th St, Beijing E-Town",
    businessHours: "周一至周五 9:00-18:00",
    businessHoursEn: "Mon-Fri 9:00-18:00",
    workTime: "工作日 9:00-18:00",
    workTimeEn: "Mon-Fri 9:00-18:00",
    holiday: "节假日休息",
    holidayEn: "Holidays closed",
    replyTime: "24小时内回复",
    replyTimeEn: "Reply within 24h",
    welcome: "欢迎来访",
    welcomeEn: "Welcome to visit",
    inquiryTypes: ["产品咨询", "ODM定制", "MPCVD配套", "技术支持", "商务合作", "其他"],
    inquiryTypesEn: ["Product Inquiry", "ODM Customization", "MPCVD Solutions", "Technical Support", "Business Partnership", "Other"]
  };

  // 检查是否已存在
  const existing = await prisma.siteConfig.findUnique({
    where: { configKey: "contact_info" }
  });

  if (existing) {
    console.log("联系信息配置已存在，更新中...");
    await prisma.siteConfig.update({
      where: { configKey: "contact_info" },
      data: { configValue: contactInfo, remark: "联系我们页面信息" }
    });
    console.log("联系信息配置已更新");
  } else {
    console.log("创建联系信息配置...");
    await prisma.siteConfig.create({
      data: {
        configKey: "contact_info",
        configValue: contactInfo,
        remark: "联系我们页面信息"
      }
    });
    console.log("联系信息配置已创建");
  }

  // 验证
  const verify = await prisma.siteConfig.findUnique({
    where: { configKey: "contact_info" }
  });
  console.log("\n验证: 联系信息配置已保存");
  console.log("  电话:", verify.configValue.phone);
  console.log("  邮箱:", verify.configValue.email);
  console.log("  地址:", verify.configValue.address);
}

main().finally(() => prisma.$disconnect());
