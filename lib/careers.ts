export interface Job {
  slug: string;
  title: string;
  titleEn: string;
  department: string;
  departmentEn: string;
  location: string;
  locationEn: string;
  type: string;
  typeEn: string;
  salary: string;
  salaryEn: string;
  experience: string;
  experienceEn: string;
  education: string;
  educationEn: string;
  tags: string[];
  tagsEn: string[];
  description: string;
  descriptionEn: string;
  responsibilities: string[];
  responsibilitiesEn: string[];
  requirements: string[];
  requirementsEn: string[];
  benefits: string[];
  benefitsEn: string[];
}

export const jobs: Job[] = [
  {
    slug: "valve-design-engineer",
    title: "阀门设计工程师",
    titleEn: "Valve Design Engineer",
    department: "研发中心",
    departmentEn: "R&D Center",
    location: "温州",
    locationEn: "Wenzhou",
    type: "全职",
    typeEn: "Full-time",
    salary: "12-20K",
    salaryEn: "12-20K",
    experience: "3-5年",
    experienceEn: "3-5 years",
    education: "本科及以上",
    educationEn: "Bachelor's degree or above",
    tags: ["阀门设计", "SolidWorks", "流体力学"],
    tagsEn: ["Valve Design", "SolidWorks", "Fluid Mechanics"],
    description: "负责闸阀、球阀、蝶阀等产品的结构设计与开发，输出图纸、BOM 与设计文档。",
    descriptionEn: "Responsible for structural design and development of gate, ball and butterfly valves, delivering drawings, BOM and design documents.",
    responsibilities: [
      "根据客户需求与技术规范完成阀门产品结构设计及计算校核",
      "输出 2D/3D 图纸、BOM 清单及设计计算书",
      "配合工艺与生产部门完成样机试制与验证",
      "参与产品标准与设计规范的编制与维护",
    ],
    responsibilitiesEn: [
      "Complete valve structural design and calculation per customer requirements and technical specifications",
      "Deliver 2D/3D drawings, BOM lists and design calculation reports",
      "Coordinate with process and production teams for prototyping and validation",
      "Participate in drafting and maintaining product standards and design specifications",
    ],
    requirements: [
      "机械设计、过程装备或相关专业本科及以上学历",
      "3 年以上阀门或流体设备设计经验，熟悉 API/GB/JB 标准",
      "熟练使用 SolidWorks、AutoCAD 等设计软件",
      "具备良好的沟通能力与团队协作精神",
    ],
    requirementsEn: [
      "Bachelor's degree or above in mechanical design, process equipment or related fields",
      "3+ years of valve or fluid equipment design experience, familiar with API/GB/JB standards",
      "Proficient in SolidWorks, AutoCAD and other design software",
      "Good communication and teamwork skills",
    ],
    benefits: ["五险一金", "带薪年假", "项目奖金", "定期体检", "节日福利"],
    benefitsEn: ["Social Insurance", "Paid Annual Leave", "Project Bonus", "Regular Checkup", "Holiday Benefits"],
  },
  {
    slug: "process-engineer",
    title: "工艺工程师（机加工）",
    titleEn: "Process Engineer (Machining)",
    department: "制造部",
    departmentEn: "Manufacturing",
    location: "温州",
    locationEn: "Wenzhou",
    type: "全职",
    typeEn: "Full-time",
    salary: "10-16K",
    salaryEn: "10-16K",
    experience: "3年以上",
    experienceEn: "3+ years",
    education: "大专及以上",
    educationEn: "Associate degree or above",
    tags: ["工艺设计", "数控编程", "工装夹具"],
    tagsEn: ["Process Design", "CNC Programming", "Fixtures"],
    description: "负责阀门零部件机加工艺设计与优化，编制工艺文件并指导现场生产。",
    descriptionEn: "Responsible for machining process design and optimization of valve parts, compiling process documents and guiding production.",
    responsibilities: [
      "编制阀门零部件机加工艺规程与数控程序",
      "设计工装夹具，解决现场工艺问题",
      "参与新产线、新设备的工艺验证与调试",
      "持续优化工艺路线，降低制造成本、提升质量",
    ],
    responsibilitiesEn: [
      "Compile machining process procedures and CNC programs for valve parts",
      "Design fixtures and solve on-site process problems",
      "Participate in process validation and commissioning of new lines and equipment",
      "Continuously optimize process routes to reduce cost and improve quality",
    ],
    requirements: [
      "机械制造或相关专业大专及以上学历",
      "3 年以上机加工艺经验，熟悉不锈钢材料加工",
      "熟练使用 CAD/CAM 软件，具备数控编程能力",
      "工作严谨，具备较强的问题分析与解决能力",
    ],
    requirementsEn: [
      "Associate degree or above in mechanical manufacturing or related fields",
      "3+ years of machining process experience, familiar with stainless steel machining",
      "Proficient in CAD/CAM software with CNC programming capability",
      "Rigorous working style with strong problem-solving ability",
    ],
    benefits: ["五险一金", "带薪年假", "绩效奖金", "定期体检", "节日福利"],
    benefitsEn: ["Social Insurance", "Paid Annual Leave", "Performance Bonus", "Regular Checkup", "Holiday Benefits"],
  },
  {
    slug: "sales-engineer",
    title: "销售工程师",
    titleEn: "Sales Engineer",
    department: "营销中心",
    departmentEn: "Sales Center",
    location: "温州",
    locationEn: "Wenzhou",
    type: "全职",
    typeEn: "Full-time",
    salary: "8-15K+提成",
    salaryEn: "8-15K + Commission",
    experience: "2年以上",
    experienceEn: "2+ years",
    education: "大专及以上",
    educationEn: "Associate degree or above",
    tags: ["工业品销售", "客户开发", "技术型销售"],
    tagsEn: ["Industrial Sales", "Customer Development", "Technical Sales"],
    description: "负责工业阀门产品在石油化工、水处理、天然气等行业的客户开发与销售。",
    descriptionEn: "Responsible for customer development and sales of industrial valves in petrochemical, water treatment and natural gas industries.",
    responsibilities: [
      "开拓并维护工业阀门客户，完成销售目标",
      "跟进项目报价、技术交流、合同签订与回款",
      "收集市场信息与竞争对手动态，反馈产品需求",
      "协助技术团队为客户提供选型方案",
    ],
    responsibilitiesEn: [
      "Develop and maintain industrial valve customers and achieve sales targets",
      "Follow up project quotations, technical exchanges, contracts and payment collection",
      "Collect market intelligence and competitor information, feed back product needs",
      "Assist technical teams in providing selection solutions for customers",
    ],
    requirements: [
      "机械、市场营销或相关专业大专及以上学历",
      "2 年以上工业品销售经验，有阀门行业资源者优先",
      "具备良好的商务谈判能力与抗压能力",
      "适应出差，持有驾照者优先",
    ],
    requirementsEn: [
      "Associate degree or above in mechanical, marketing or related fields",
      "2+ years of industrial sales experience, valve industry resources preferred",
      "Good negotiation skills and ability to work under pressure",
      "Willing to travel; driver's license preferred",
    ],
    benefits: ["五险一金", "带薪年假", "销售提成", "出差补贴", "节日福利"],
    benefitsEn: ["Social Insurance", "Paid Annual Leave", "Sales Commission", "Travel Allowance", "Holiday Benefits"],
  },
  {
    slug: "quality-engineer",
    title: "质检工程师",
    titleEn: "Quality Engineer",
    department: "质量部",
    departmentEn: "Quality Department",
    location: "温州",
    locationEn: "Wenzhou",
    type: "全职",
    typeEn: "Full-time",
    salary: "8-12K",
    salaryEn: "8-12K",
    experience: "2年以上",
    experienceEn: "2+ years",
    education: "大专及以上",
    educationEn: "Associate degree or above",
    tags: ["质量控制", "ISO9001", "无损检测"],
    tagsEn: ["Quality Control", "ISO9001", "NDT"],
    description: "负责阀门产品来料、过程与出厂检验，维护质量管理体系运行。",
    descriptionEn: "Responsible for incoming, in-process and final inspection of valve products, maintaining the quality management system.",
    responsibilities: [
      "执行来料、过程与出厂检验，记录检测数据",
      "按标准执行壳体耐压、密封与气密性试验",
      "跟踪不合格品处理与纠正预防措施",
      "协助维护 ISO9001 质量体系文件",
    ],
    responsibilitiesEn: [
      "Perform incoming, in-process and final inspection with test data recording",
      "Conduct shell pressure, sealing and air-tightness tests per standards",
      "Follow up non-conforming product handling and corrective/preventive actions",
      "Assist in maintaining ISO9001 quality system documentation",
    ],
    requirements: [
      "机械或质量管理相关专业大专及以上学历",
      "2 年以上阀门或机械行业质检经验",
      "熟悉 API/GB/JB 检测标准，有探伤资质者优先",
      "原则性强，工作细致负责",
    ],
    requirementsEn: [
      "Associate degree or above in mechanical or quality management",
      "2+ years of quality inspection experience in valve or mechanical industry",
      "Familiar with API/GB/JB testing standards, NDT qualification preferred",
      "Strong principles and meticulous work attitude",
    ],
    benefits: ["五险一金", "带薪年假", "绩效奖金", "定期体检", "节日福利"],
    benefitsEn: ["Social Insurance", "Paid Annual Leave", "Performance Bonus", "Regular Checkup", "Holiday Benefits"],
  },
  {
    slug: "production-supervisor",
    title: "生产主管",
    titleEn: "Production Supervisor",
    department: "制造部",
    departmentEn: "Manufacturing",
    location: "温州",
    locationEn: "Wenzhou",
    type: "全职",
    typeEn: "Full-time",
    salary: "10-15K",
    salaryEn: "10-15K",
    experience: "5年以上",
    experienceEn: "5+ years",
    education: "大专及以上",
    educationEn: "Associate degree or above",
    tags: ["生产管理", "精益生产", "团队管理"],
    tagsEn: ["Production Management", "Lean Manufacturing", "Team Management"],
    description: "负责车间生产计划、人员管理与现场改善，保障订单按时交付。",
    descriptionEn: "Responsible for workshop production planning, personnel management and on-site improvement to ensure on-time delivery.",
    responsibilities: [
      "编制并执行生产计划，协调各工序产能",
      "管理车间人员、设备与物料，确保安全生产",
      "推进精益生产与现场 6S 管理",
      "组织异常处理与产能瓶颈改善",
    ],
    responsibilitiesEn: [
      "Compile and execute production plans, coordinate capacity across processes",
      "Manage workshop personnel, equipment and materials with safe production",
      "Promote lean manufacturing and on-site 6S management",
      "Organize exception handling and capacity bottleneck improvement",
    ],
    requirements: [
      "机械制造或管理类相关专业大专及以上学历",
      "5 年以上制造业生产管理经验，阀门行业优先",
      "熟悉机加工与装配工艺流程",
      "具备较强的组织协调与现场管理能力",
    ],
    requirementsEn: [
      "Associate degree or above in mechanical manufacturing or management",
      "5+ years of production management in manufacturing, valve industry preferred",
      "Familiar with machining and assembly processes",
      "Strong organization, coordination and on-site management skills",
    ],
    benefits: ["五险一金", "带薪年假", "年终奖金", "定期体检", "节日福利"],
    benefitsEn: ["Social Insurance", "Paid Annual Leave", "Year-end Bonus", "Regular Checkup", "Holiday Benefits"],
  },
  {
    slug: "cnc-machinist",
    title: "CNC 操作技师",
    titleEn: "CNC Machinist",
    department: "制造部",
    departmentEn: "Manufacturing",
    location: "温州",
    locationEn: "Wenzhou",
    type: "全职",
    typeEn: "Full-time",
    salary: "7-11K",
    salaryEn: "7-11K",
    experience: "2年以上",
    experienceEn: "2+ years",
    education: "中专及以上",
    educationEn: "Technical school or above",
    tags: ["CNC", "数控车床", "加工中心"],
    tagsEn: ["CNC", "CNC Lathe", "Machining Center"],
    description: "操作数控车床与加工中心完成阀门零部件加工，保证加工质量与效率。",
    descriptionEn: "Operate CNC lathes and machining centers to process valve parts with guaranteed quality and efficiency.",
    responsibilities: [
      "独立操作数控车床/加工中心，按图纸完成零件加工",
      "负责首件自检与过程抽检，保证加工精度",
      "执行设备日常点检与保养",
      "配合工艺改进，提出加工优化建议",
    ],
    responsibilitiesEn: [
      "Independently operate CNC lathes/machining centers per drawings",
      "Perform first-article self-inspection and in-process sampling to ensure precision",
      "Carry out routine equipment inspection and maintenance",
      "Cooperate with process improvement and propose optimization suggestions",
    ],
    requirements: [
      "数控或机械相关专业中专及以上学历",
      "2 年以上 CNC 操作经验，能看懂机械图纸",
      "熟悉不锈钢等难加工材料特性",
      "工作认真负责，具备质量意识",
    ],
    requirementsEn: [
      "Technical school degree or above in CNC or mechanical fields",
      "2+ years of CNC operation experience, able to read mechanical drawings",
      "Familiar with machining of difficult-to-machine materials such as stainless steel",
      "Serious and responsible work with quality awareness",
    ],
    benefits: ["五险一金", "带薪年假", "计件奖金", "定期体检", "节日福利"],
    benefitsEn: ["Social Insurance", "Paid Annual Leave", "Piece-rate Bonus", "Regular Checkup", "Holiday Benefits"],
  },
];

export function getJobBySlug(slug: string): Job | undefined {
  return jobs.find((j) => j.slug === slug);
}

export function getAllJobSlugs(): string[] {
  return jobs.map((j) => j.slug);
}
