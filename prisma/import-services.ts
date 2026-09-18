import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

const services = [
  {
    slug: 'odm',
    title: 'ODM定制服务',
    titleEn: 'ODM Custom Service',
    subtitle: '从需求到量产，全流程定制化服务',
    subtitleEn: 'From requirement to mass production, full-process customization',
    description: '左文科技提供专业的ODM定制服务，根据客户需求提供从产品设计、研发、生产到交付的全流程定制化解决方案。我们拥有专业的研发团队和先进的生产设备，能够满足客户在MPCVD设备、金刚石材料、培育钻石等领域的定制化需求。',
    descriptionEn: 'ZUO WEN TECHNOLOGY provides professional ODM custom services, offering full-process customized solutions from product design, R&D, production to delivery according to customer needs.',
    features: [
      { title: '需求分析', desc: '深入了解客户需求，提供专业的技术咨询和方案设计' },
      { title: '产品研发', desc: '专业研发团队，提供从概念到原型的全流程研发服务' },
      { title: '生产制造', desc: '万级洁净车间，精密加工设备，确保产品质量' },
      { title: '质量管控', desc: '完善的质量管理体系，从原材料到成品全流程检测' },
      { title: '交付服务', desc: '高效的供应链管理，确保产品按时交付' },
      { title: '售后支持', desc: '专业的技术支持团队，提供全方位的售后服务' },
    ],
    process: [
      { step: '01', title: '需求沟通', desc: '了解客户需求和应用场景' },
      { step: '02', title: '方案设计', desc: '提供技术方案和报价' },
      { step: '03', title: '原型开发', desc: '产品设计和原型制作' },
      { step: '04', title: '测试验证', desc: '产品测试和性能验证' },
      { step: '05', title: '批量生产', desc: '量产和质量管控' },
      { step: '06', title: '交付售后', desc: '产品交付和售后支持' },
    ],
    icon: 'Settings',
    sortOrder: 1,
  },
  {
    slug: 'mpcvd',
    title: 'MPCVD工艺服务',
    titleEn: 'MPCVD Process Service',
    subtitle: '专业的MPCVD金刚石制备工艺解决方案',
    subtitleEn: 'Professional MPCVD diamond preparation process solutions',
    description: '左文科技拥有多年MPCVD金刚石制备工艺经验，提供从工艺开发、参数优化到量产支持的全流程工艺服务。我们的工艺专家团队能够帮助客户快速掌握MPCVD设备的操作和工艺优化，提高金刚石材料的质量和生产效率。',
    descriptionEn: 'ZUO WEN TECHNOLOGY has years of experience in MPCVD diamond preparation process, providing full-process process services from process development, parameter optimization to mass production support.',
    features: [
      { title: '工艺开发', desc: '根据客户需求开发定制化的MPCVD金刚石制备工艺' },
      { title: '参数优化', desc: '优化生长参数，提高金刚石质量和生长效率' },
      { title: '设备调试', desc: '专业的设备安装调试服务，确保设备稳定运行' },
      { title: '人员培训', desc: '提供全面的操作人员培训，确保客户能够独立操作' },
      { title: '技术支持', desc: '长期的技术支持和工艺咨询服务' },
      { title: '量产支持', desc: '从实验室到量产的全流程技术支持' },
    ],
    process: [
      { step: '01', title: '工艺评估', desc: '评估客户需求和现有工艺' },
      { step: '02', title: '方案制定', desc: '制定工艺优化和开发方案' },
      { step: '03', title: '实验验证', desc: '实验室工艺验证和参数优化' },
      { step: '04', title: '设备调试', desc: '设备安装调试和工艺导入' },
      { step: '05', title: '人员培训', desc: '操作人员培训和技术交底' },
      { step: '06', title: '量产支持', desc: '量产工艺优化和持续支持' },
    ],
    icon: 'FlaskConical',
    sortOrder: 2,
  },
  {
    slug: 'technical-support',
    title: '技术支持',
    titleEn: 'Technical Support',
    subtitle: '专业的技术团队，全方位的技术支持服务',
    subtitleEn: 'Professional technical team, comprehensive technical support services',
    description: '左文科技拥有专业的技术支持团队，提供从设备安装、操作培训到故障排除的全方位技术支持服务。我们的技术工程师具有丰富的现场经验，能够快速响应客户需求，确保设备稳定运行和客户生产顺利进行。',
    descriptionEn: 'ZUO WEN TECHNOLOGY has a professional technical support team, providing comprehensive technical support services from equipment installation, operation training to troubleshooting.',
    features: [
      { title: '设备安装', desc: '专业的设备安装调试服务，确保设备正常运行' },
      { title: '操作培训', desc: '全面的操作人员培训，确保客户能够独立操作' },
      { title: '故障排除', desc: '快速响应的故障排除服务，减少设备停机时间' },
      { title: '远程支持', desc: '远程技术支持，快速解决常见问题' },
      { title: '现场服务', desc: '专业工程师现场服务，解决复杂问题' },
      { title: '技术咨询', desc: '长期的技术咨询和工艺优化建议' },
    ],
    process: [
      { step: '01', title: '问题提交', desc: '客户提交技术问题或服务需求' },
      { step: '02', title: '问题评估', desc: '技术团队评估问题和解决方案' },
      { step: '03', title: '远程支持', desc: '远程技术支持和指导' },
      { step: '04', title: '现场服务', desc: '必要时派遣工程师现场服务' },
      { step: '05', title: '问题解决', desc: '解决问题并验证设备运行' },
      { step: '06', title: '跟踪反馈', desc: '后续跟踪和客户满意度调查' },
    ],
    icon: 'Headphones',
    sortOrder: 3,
  },
  {
    slug: 'after-sales',
    title: '售后服务',
    titleEn: 'After-sales Service',
    subtitle: '完善的售后服务体系，让客户无后顾之忧',
    subtitleEn: 'Comprehensive after-sales service system, worry-free for customers',
    description: '左文科技建立了完善的售后服务体系，提供从质保服务、备件供应到设备维护的全流程售后服务。我们承诺为客户提供高质量的产品和服务，确保客户在使用过程中无后顾之忧。',
    descriptionEn: 'ZUO WEN TECHNOLOGY has established a comprehensive after-sales service system, providing full-process after-sales service from warranty service, spare parts supply to equipment maintenance.',
    features: [
      { title: '质保服务', desc: '产品质保期内免费维修和更换服务' },
      { title: '备件供应', desc: '充足的备件库存，快速响应备件需求' },
      { title: '设备维护', desc: '定期的设备维护保养服务，延长设备寿命' },
      { title: '升级服务', desc: '设备升级和改造服务，提升设备性能' },
      { title: '响应承诺', desc: '24小时内响应，48小时内现场服务' },
      { title: '客户关怀', desc: '定期的客户回访和满意度调查' },
    ],
    process: [
      { step: '01', title: '服务申请', desc: '客户提交售后服务申请' },
      { step: '02', title: '服务响应', desc: '24小时内响应客户需求' },
      { step: '03', title: '问题诊断', desc: '远程或现场诊断问题' },
      { step: '04', title: '维修服务', desc: '提供维修或更换服务' },
      { step: '05', title: '验收确认', desc: '客户验收并确认服务完成' },
      { step: '06', title: '跟踪回访', desc: '后续跟踪和客户满意度调查' },
    ],
    icon: 'ShieldCheck',
    sortOrder: 4,
  },
]

async function main() {
  console.log('开始导入服务数据...')

  for (const service of services) {
    const existing = await prisma.service.findUnique({
      where: { slug: service.slug },
    })

    if (existing) {
      await prisma.service.update({
        where: { slug: service.slug },
        data: service,
      })
      console.log(`更新服务: ${service.title}`)
    } else {
      await prisma.service.create({
        data: service,
      })
      console.log(`创建服务: ${service.title}`)
    }
  }

  console.log('服务数据导入完成！')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
