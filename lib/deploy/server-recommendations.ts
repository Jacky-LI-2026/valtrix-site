// 服务器配置推荐数据
export interface ServerRecommendation {
  id: string;
  provider: string;
  providerName: string;
  region: string;
  regionName: string;
  tier: string;
  tierName: string;
  cpu: string;
  memory: string;
  storage: string;
  bandwidth: string;
  os: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  suitableFor: string[];
  features: string[];
  recommended: boolean;
  purchaseUrl?: string;
}

export const serverRecommendations: ServerRecommendation[] = [
  // 阿里云 - 国内服务器
  {
    id: "aliyun-basic",
    provider: "aliyun",
    providerName: "阿里云",
    region: "cn-hangzhou",
    regionName: "华东1（杭州）",
    tier: "basic",
    tierName: "入门型",
    cpu: "2核",
    memory: "4GB",
    storage: "40GB ESSD云盘",
    bandwidth: "3Mbps",
    os: "Ubuntu 22.04 LTS",
    priceMonthly: 99,
    priceYearly: 990,
    currency: "CNY",
    suitableFor: ["企业官网", "小型博客", "展示型网站"],
    features: ["支持IPv4/IPv6", "DDoS基础防护", "快照备份", "云监控"],
    recommended: false,
    purchaseUrl: "https://www.aliyun.com/product/ecs",
  },
  {
    id: "aliyun-standard",
    provider: "aliyun",
    providerName: "阿里云",
    region: "cn-shenzhen",
    regionName: "华南1（深圳）",
    tier: "standard",
    tierName: "标准型",
    cpu: "4核",
    memory: "8GB",
    storage: "80GB ESSD云盘",
    bandwidth: "5Mbps",
    os: "Ubuntu 22.04 LTS",
    priceMonthly: 249,
    priceYearly: 2490,
    currency: "CNY",
    suitableFor: ["企业官网", "内容管理系统", "中小型电商", "后台管理系统"],
    features: ["支持IPv4/IPv6", "DDoS基础防护", "快照备份", "云监控", "负载均衡", "弹性伸缩"],
    recommended: true,
    purchaseUrl: "https://www.aliyun.com/product/ecs",
  },
  {
    id: "aliyun-pro",
    provider: "aliyun",
    providerName: "阿里云",
    region: "cn-beijing",
    regionName: "华北2（北京）",
    tier: "pro",
    tierName: "高性能型",
    cpu: "8核",
    memory: "16GB",
    storage: "160GB ESSD云盘",
    bandwidth: "10Mbps",
    os: "Ubuntu 22.04 LTS",
    priceMonthly: 599,
    priceYearly: 5990,
    currency: "CNY",
    suitableFor: ["高流量企业官网", "大型电商平台", "SaaS应用", "数据密集型应用"],
    features: ["支持IPv4/IPv6", "DDoS高防", "快照备份", "云监控", "负载均衡", "弹性伸缩", "容器服务", "CDN加速"],
    recommended: false,
    purchaseUrl: "https://www.aliyun.com/product/ecs",
  },
  // 美国服务器 - 海外访问
  {
    id: "us-basic",
    provider: "us",
    providerName: "美国服务器",
    region: "us-west",
    regionName: "美国西部（洛杉矶）",
    tier: "basic",
    tierName: "入门型",
    cpu: "2核",
    memory: "4GB",
    storage: "50GB SSD",
    bandwidth: "100Mbps",
    os: "Ubuntu 22.04 LTS",
    priceMonthly: 199,
    priceYearly: 1990,
    currency: "CNY",
    suitableFor: ["海外展示型网站", "小型博客", "测试环境"],
    features: ["CN2 GIA线路", "国内访问优化", "DDoS防护", "快照备份", "独立IP"],
    recommended: false,
    purchaseUrl: "https://www.vultr.com/?ref=8941234",
  },
  {
    id: "us-standard",
    provider: "us",
    providerName: "美国服务器",
    region: "us-east",
    regionName: "美国东部（纽约）",
    tier: "standard",
    tierName: "标准型",
    cpu: "4核",
    memory: "8GB",
    storage: "100GB SSD",
    bandwidth: "200Mbps",
    os: "Ubuntu 22.04 LTS",
    priceMonthly: 399,
    priceYearly: 3990,
    currency: "CNY",
    suitableFor: ["海外企业官网", "跨境电商", "海外用户访问的应用", "镜像备份服务器"],
    features: ["CN2 GIA线路", "国内访问优化", "DDoS防护", "快照备份", "独立IP", "负载均衡", "CDN加速"],
    recommended: true,
    purchaseUrl: "https://www.digitalocean.com/?refcode=abc123",
  },
  {
    id: "us-pro",
    provider: "us",
    providerName: "美国服务器",
    region: "us-west",
    regionName: "美国西部（旧金山）",
    tier: "pro",
    tierName: "高性能型",
    cpu: "8核",
    memory: "16GB",
    storage: "200GB NVMe SSD",
    bandwidth: "500Mbps",
    os: "Ubuntu 22.04 LTS",
    priceMonthly: 799,
    priceYearly: 7990,
    currency: "CNY",
    suitableFor: ["高流量海外网站", "大型跨境电商", "海外SaaS应用", "数据备份中心"],
    features: ["CN2 GIA线路", "国内访问优化", "DDoS高防", "快照备份", "独立IP", "负载均衡", "容器服务", "CDN加速", "自动扩容"],
    recommended: false,
    purchaseUrl: "https://www.linode.com/?r=abc123",
  },
  // 香港服务器
  {
    id: "hk-basic",
    provider: "hk",
    providerName: "香港服务器",
    region: "hk",
    regionName: "香港（新界）",
    tier: "basic",
    tierName: "入门型",
    cpu: "2核",
    memory: "4GB",
    storage: "50GB SSD",
    bandwidth: "100Mbps",
    os: "Ubuntu 22.04 LTS",
    priceMonthly: 149,
    priceYearly: 1490,
    currency: "CNY",
    suitableFor: ["企业官网", "小型博客", "测试环境", "面向东南亚用户"],
    features: ["CN2 GIA线路", "国内访问极速", "免备案", "DDoS防护", "快照备份", "独立IP"],
    recommended: false,
    purchaseUrl: "https://www.aliyun.com/product/ecs/hongkong",
  },
  {
    id: "hk-standard",
    provider: "hk",
    providerName: "香港服务器",
    region: "hk",
    regionName: "香港（九龙）",
    tier: "standard",
    tierName: "标准型",
    cpu: "4核",
    memory: "8GB",
    storage: "100GB SSD",
    bandwidth: "200Mbps",
    os: "Ubuntu 22.04 LTS",
    priceMonthly: 299,
    priceYearly: 2990,
    currency: "CNY",
    suitableFor: ["企业官网", "跨境电商", "面向中国大陆和东南亚用户", "镜像备份服务器"],
    features: ["CN2 GIA线路", "国内访问极速", "免备案", "DDoS防护", "快照备份", "独立IP", "负载均衡", "CDN加速"],
    recommended: true,
    purchaseUrl: "https://www.aliyun.com/product/ecs/hongkong",
  },
  {
    id: "hk-pro",
    provider: "hk",
    providerName: "香港服务器",
    region: "hk",
    regionName: "香港（香港岛）",
    tier: "pro",
    tierName: "高性能型",
    cpu: "8核",
    memory: "16GB",
    storage: "200GB NVMe SSD",
    bandwidth: "500Mbps",
    os: "Ubuntu 22.04 LTS",
    priceMonthly: 599,
    priceYearly: 5990,
    currency: "CNY",
    suitableFor: ["高流量企业官网", "大型跨境电商", "海外SaaS应用", "数据备份中心"],
    features: ["CN2 GIA线路", "国内访问极速", "免备案", "DDoS高防", "快照备份", "独立IP", "负载均衡", "容器服务", "CDN加速", "自动扩容"],
    recommended: false,
    purchaseUrl: "https://www.aliyun.com/product/ecs/hongkong",
  },
];

// 部署建议
export const deploymentAdvice = {
  architecture: {
    title: "推荐部署架构",
    items: [
      "国内主站：阿里云深圳/杭州节点，面向国内用户快速访问",
      "海外镜像：美国洛杉矶/纽约节点，面向海外用户访问",
      "数据库：主库在国内，海外节点使用只读副本或独立数据库",
      "静态资源：使用CDN加速（阿里云CDN / Cloudflare）",
      "文件存储：使用对象存储（阿里云OSS / AWS S3）",
    ],
  },
  environment: {
    title: "服务器环境要求",
    items: [
      "操作系统：Ubuntu 22.04 LTS / CentOS 8+",
      "Node.js：v18.x 或 v20.x（推荐使用nvm管理）",
      "数据库：PostgreSQL 15+",
      "进程管理：PM2（推荐）或 Systemd",
      "反向代理：Nginx（处理静态资源、SSL、反向代理）",
      "Git：用于代码拉取和版本管理",
    ],
  },
  security: {
    title: "安全配置建议",
    items: [
      "SSH密钥登录，禁用密码登录",
      "修改SSH默认端口（22 → 其他端口）",
      "配置防火墙（ufw/iptables），只开放必要端口",
      "启用自动安全更新",
      "配置SSL证书（Let's Encrypt免费证书）",
      "定期备份数据库和重要文件",
      "配置日志监控和告警",
    ],
  },
  optimization: {
    title: "性能优化建议",
    items: [
      "启用Next.js静态生成和ISR，减少服务器压力",
      "配置Nginx gzip压缩和缓存",
      "使用CDN加速静态资源",
      "数据库连接池优化",
      "定期清理日志和临时文件",
      "监控服务器资源使用情况，及时扩容",
    ],
  },
};

// 根据需求推荐服务器
export function recommendServer(
  traffic: "low" | "medium" | "high",
  region: "china" | "us" | "both"
): ServerRecommendation[] {
  const results: ServerRecommendation[] = [];
  
  if (region === "china" || region === "both") {
    const chinaServers = serverRecommendations.filter(s => s.provider === "aliyun");
    if (traffic === "low") results.push(chinaServers[0]);
    else if (traffic === "medium") results.push(chinaServers[1]);
    else results.push(chinaServers[2]);
  }
  
  if (region === "us" || region === "both") {
    const usServers = serverRecommendations.filter(s => s.provider === "us");
    if (traffic === "low") results.push(usServers[0]);
    else if (traffic === "medium") results.push(usServers[1]);
    else results.push(usServers[2]);
  }
  
  return results;
}
