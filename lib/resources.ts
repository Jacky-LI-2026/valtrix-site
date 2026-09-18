export interface ResourceItem {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  format: string;
  size: string;
  date: string;
  downloadUrl: string;
}

export interface ResourceCategory {
  type: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  items: ResourceItem[];
}

export const resourceCategories: ResourceCategory[] = [
  {
    type: "manuals",
    title: "产品样本",
    titleEn: "Product Catalogs",
    description: "全系列阀门产品技术样本，包含闸阀、球阀、蝶阀、止回阀等产品的参数与选型指南。",
    descriptionEn: "Full-range valve technical catalogs with parameters and selection guides for gate, ball, butterfly, check and other valves.",
    icon: "FileText",
    items: [
      { slug: "gate-valve-catalog", title: "闸阀产品样本", titleEn: "Gate Valve Catalog", description: "暗杆/明杆闸阀的技术参数、尺寸图、应用案例和选型指南。", descriptionEn: "Technical parameters, dimension drawings, application cases and selection guide for non-rising/rising stem gate valves.", format: "PDF", size: "3.2 MB", date: "2026-05-01", downloadUrl: "/downloads/valve-tech-valve-catalog.pdf" },
      { slug: "ball-valve-catalog", title: "球阀产品样本", titleEn: "Ball Valve Catalog", description: "两片式、三片式、法兰式球阀的技术参数与选型指南。", descriptionEn: "Technical parameters and selection guide for two-piece, three-piece and flanged ball valves.", format: "PDF", size: "2.8 MB", date: "2026-04-15", downloadUrl: "/downloads/valve-tech-valve-catalog.pdf" },
      { slug: "butterfly-valve-catalog", title: "蝶阀产品样本", titleEn: "Butterfly Valve Catalog", description: "对夹式、法兰式蝶阀的技术参数、扭矩数据与选型指南。", descriptionEn: "Technical parameters, torque data and selection guide for wafer and flanged butterfly valves.", format: "PDF", size: "2.4 MB", date: "2026-03-20", downloadUrl: "/downloads/valve-tech-valve-catalog.pdf" },
      { slug: "fittings-catalog", title: "卡套接头产品样本", titleEn: "Tube Fittings Catalog", description: "316L 卡套接头、双卡套连接件的规格参数与安装说明。", descriptionEn: "Specifications and installation instructions for 316L compression tube fittings and double-ferrule connectors.", format: "PDF", size: "1.9 MB", date: "2026-03-01", downloadUrl: "/downloads/valve-tech-valve-catalog.pdf" },
    ],
  },
  {
    type: "certificates",
    title: "资质证书",
    titleEn: "Certificates",
    description: "公司资质证书和产品认证证书，包括 ISO9001、CE、API 6D 等。",
    descriptionEn: "Company qualification certificates and product certifications including ISO9001, CE, API 6D.",
    icon: "Award",
    items: [
      { slug: "iso9001-cert", title: "ISO9001 质量管理体系认证", titleEn: "ISO9001 Quality Management Certification", description: "ISO9001:2015 质量管理体系认证证书，覆盖设计开发、生产和销售服务。", descriptionEn: "ISO9001:2015 quality management system certificate covering design, production and service.", format: "PDF", size: "0.8 MB", date: "2025-12-01", downloadUrl: "#" },
      { slug: "ce-cert", title: "CE 认证", titleEn: "CE Certification", description: "产品符合欧盟 CE 认证要求，可在欧盟市场自由流通。", descriptionEn: "Products comply with EU CE certification requirements for free circulation in the EU market.", format: "PDF", size: "1.1 MB", date: "2025-10-15", downloadUrl: "#" },
      { slug: "api6d-cert", title: "API 6D 认证", titleEn: "API 6D Certification", description: "管线阀门产品符合 API 6D 标准，适用于油气长输管线。", descriptionEn: "Pipeline valve products comply with API 6D standard for oil & gas long-distance pipelines.", format: "PDF", size: "1.4 MB", date: "2026-04-10", downloadUrl: "#" },
    ],
  },
  {
    type: "drawings",
    title: "图纸下载",
    titleEn: "Drawings",
    description: "产品 2D/3D 图纸下载，支持 STEP、IGES、DWG 等多种格式。",
    descriptionEn: "Product 2D/3D drawing downloads supporting STEP, IGES, DWG and other formats.",
    icon: "FileImage",
    items: [
      { slug: "gate-valve-drawing", title: "闸阀外形尺寸图", titleEn: "Gate Valve Dimension Drawings", description: "全系列闸阀的 2D 外形尺寸图和安装接口图。", descriptionEn: "2D outline dimension drawings and installation interface drawings for all gate valve series.", format: "DWG/PDF", size: "6.8 MB", date: "2026-05-10", downloadUrl: "#" },
      { slug: "ball-valve-drawing", title: "球阀安装图纸", titleEn: "Ball Valve Installation Drawings", description: "球阀的安装尺寸图和管路连接示意图。", descriptionEn: "Installation dimension drawings and piping connection diagrams for ball valves.", format: "DWG/PDF", size: "5.2 MB", date: "2026-04-20", downloadUrl: "#" },
      { slug: "butterfly-valve-3d", title: "蝶阀 3D 模型", titleEn: "Butterfly Valve 3D Models", description: "蝶阀的 3D 模型文件，支持 STEP/IGES 格式。", descriptionEn: "3D model files for butterfly valves in STEP/IGES formats.", format: "STEP/IGES", size: "12.6 MB", date: "2026-03-25", downloadUrl: "#" },
      { slug: "fittings-drawing", title: "卡套接头尺寸图", titleEn: "Tube Fittings Dimension Drawings", description: "卡套接头、VCR 接头的详细尺寸图和拧紧扭矩要求。", descriptionEn: "Detailed dimension drawings and torque requirements for compression and VCR fittings.", format: "DWG/PDF", size: "3.8 MB", date: "2026-03-05", downloadUrl: "#" },
    ],
  },
];

export function getResourceCategory(type: string): ResourceCategory | undefined {
  return resourceCategories.find((c) => c.type === type);
}

export function getAllResourceTypes(): string[] {
  return resourceCategories.map((c) => c.type);
}
