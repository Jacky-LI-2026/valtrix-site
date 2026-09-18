"use client";

import { useState, useEffect } from "react";
import PageHero from "@/components/ui/PageHero";
import Link from "next/link";
import { ArrowRight, MapPin, Briefcase, Clock, Users, GraduationCap, Heart, TrendingUp, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { usePageConfig } from "@/lib/api/usePageConfig";
import { getRecruitEmail } from "@/lib/brand";

interface Job {
  id: string;
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
  description: string[] | string;
  descriptionEn: string[] | string;
}

const benefits = [
  { icon: GraduationCap, title: "成长空间", titleEn: "Growth", titleJa: "成長機会", titleKo: "성장 기회", titleFr: "Opportunités de croissance", titleAr: "فرص النمو", desc: "完善的培训体系和晋升通道，助力职业发展", descEn: "Comprehensive training and promotion pathways for career development", descJa: "充実した研修制度と昇進通道で、キャリアアップを支援", descKo: "체계적인 교육 시스템과 승진 경로로 경력 개발 지원", descFr: "Système de formation complet et voies de promotion pour le développement de carrière", descAr: "نظام تدريبي شامل ومسارات ترقية لدعم التطور المهني" },
  { icon: Heart, title: "福利保障", titleEn: "Benefits", titleJa: "福利厚生", titleKo: "복지 보장", titleFr: "Protection sociale", titleAr: "الضمان الاجتماعي", desc: "五险一金、带薪年假、节日福利、定期体检", descEn: "Social insurance, paid annual leave, holiday benefits, regular health checkups", descJa: "社会保険・住宅積立金、有給休暇、祝日福利、定期健康診断", descKo: "사회보험 및 주택적립금, 유급휴가, 명절 복지, 정기 건강검진", descFr: "Assurance sociale et fonds de logement, congés payés, avantages festifs, bilans de santé réguliers", descAr: "التأمينات الاجتماعية وصندوق الإسكان، الإجازات المدفوعة، مزايا العطلات، الفحوصات الطبية الدورية" },
  { icon: TrendingUp, title: "有竞争力薪酬", titleEn: "Competitive Pay", titleJa: "競争力のある給与", titleKo: "경쟁력 있는 급여", titleFr: "Rémunération compétitive", titleAr: "راتب تنافسي", desc: "行业领先的薪资水平，绩效奖金和项目奖励", descEn: "Industry-leading salary with performance bonuses and project rewards", descJa: "業界をリードする給与水準、業績ボーナスとプロジェクト報奨", descKo: "업계 선두의 급여 수준, 성과급 및 프로젝트 보상", descFr: "Niveaux de salaire leaders du secteur, primes de performance et récompenses de projet", descAr: "مستويات رواتب رائدة في القطاع، ومكافآت الأداء ومكافآت المشاريع" },
  { icon: Users, title: "团队氛围", titleEn: "Team Culture", titleJa: "チーム風土", titleKo: "팀 분위기", titleFr: "Ambiance d'équipe", titleAr: "جو الفريق", desc: "专业、和谐、充满活力的团队氛围", descEn: "Professional, harmonious and dynamic team environment", descJa: "専門的で調和のとれた活気あるチーム風土", descKo: "전문적이고 화목하며 활기찬 팀 분위기", descFr: "Ambiance d'équipe professionnelle, harmonieuse et dynamique", descAr: "جو فريق مهني ومنسجم وحيوي" },
];

export default function CareersPage() {
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const { pageConfig } = usePageConfig("careers");

  // icon 名称到组件的映射
  const iconMap: Record<string, any> = { GraduationCap, Heart, TrendingUp, Users };

  useEffect(() => {
    fetch("/api/public/careers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setJobs(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/public/site-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) setSiteConfig(data.data);
      })
      .catch(() => {});
  }, []);

  // 从后台配置获取福利数据，缺则用硬编码
  const apiBenefits = siteConfig?.careersBenefits;
  const benefitList = Array.isArray(apiBenefits) && apiBenefits.length > 0
    ? apiBenefits.map((b: any) => ({
        icon: iconMap[b.icon] || Heart,
        title: b.title?.zh || "",
        titleEn: b.title?.en || "",
        titleJa: b.title?.ja || "",
        titleKo: b.title?.ko || "",
        titleFr: b.title?.fr || "",
        titleAr: b.title?.ar || "",
        desc: b.desc?.zh || "",
        descEn: b.desc?.en || "",
        descJa: b.desc?.ja || "",
        descKo: b.desc?.ko || "",
        descFr: b.desc?.fr || "",
        descAr: b.desc?.ar || "",
      }))
    : benefits;

  // 投递邮箱：DB 优先，兜底取部署级 env；为空时不渲染投递按钮（不留 mailto: 空链接）
  const recruitEmail = (siteConfig?.contact_info?.recruitEmails || siteConfig?.contact_info?.email || getRecruitEmail())
    .split(/[,，\s]+/)
    .filter(Boolean)
    .join(",");

  return (
    <>
      <PageHero
        title={pageConfig?.title || t("careers")}
        titleEn={pageConfig?.titleEn || "Join Us"}
        subtitle={pageConfig?.subtitle || t("careersPageSubtitle")}
        subtitleEn={pageConfig?.subtitleEn || "VALTRIX looks forward to working with talented individuals like you to advance fluid control technology"}
        breadcrumb={pageConfig?.breadcrumb || t("careers")}
        breadcrumbEn={pageConfig?.breadcrumbEn || "Careers"}
      />

      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-block w-12 h-1 bg-primary mb-4" />
            <h2 className="text-3xl font-bold text-dark mb-4">{t("whyJoin")}</h2>
            <p className="text-dark-500">{t("whyJoinDesc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefitList.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <Icon size={28} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-dark mb-2">{loc.get(item, "title")}</h3>
                  <p className="text-dark-500 text-sm leading-relaxed">{loc.get(item, "desc")}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-dark-50">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-block w-12 h-1 bg-primary mb-4" />
            <h2 className="text-3xl font-bold text-dark mb-4">{t("openPositions")}</h2>
            <p className="text-dark-500">{t("findRightJob")}</p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-dark-400">{t("loading")}</div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/careers/${job.slug}`}
                  className="block bg-white rounded-lg border border-dark-100 p-6 lg:p-8 hover:border-primary hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-dark">{loc.get(job, "title")}</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded">{loc.get(job, "department")}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-dark-500 mb-3">
                        <span className="flex items-center gap-1"><MapPin size={14} />{loc.get(job, "location")}</span>
                        <span className="flex items-center gap-1"><Briefcase size={14} />{loc.get(job, "type")}</span>
                        <span className="flex items-center gap-1"><Clock size={14} />{loc.get(job, "experience")}</span>
                        <span className="flex items-center gap-1"><GraduationCap size={14} />{loc.get(job, "education")}</span>
                      </div>
                      <p className="text-dark-500 text-sm mb-3">{loc.getText(job, "description")}</p>
                      <div className="flex flex-wrap gap-2">
                        {loc.getArray(job, "tags")?.map((tag: string) => (
                          <span key={tag} className="text-xs bg-dark-50 text-dark-500 px-2.5 py-1 rounded">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-start lg:items-end gap-3">
                      <div className="text-xl font-bold text-primary">{loc.get(job, "salary")}</div>
                      <span className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:gap-2 transition-all">
                        {t("viewDetails")}
                        <ArrowRight size={14} className="rtl-flip" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-primary">
        <div className="container text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">{t("noRightPosition")}</h2>
          <p className="text-white/80 mb-8">{t("sendResumeDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {recruitEmail && (
              <a href={`mailto:${recruitEmail}`} className="inline-flex items-center gap-2 bg-white text-primary hover:bg-dark-50 px-8 py-3 rounded font-medium transition-all">
                <Mail size={18} />
                {t("sendResume")}
                <ArrowRight size={18} className="rtl-flip" />
              </a>
            )}
            <Link href="/contact" className="inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-3 rounded font-medium transition-all">
              {t("contact")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
