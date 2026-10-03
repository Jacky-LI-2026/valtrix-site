"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin, Briefcase, Clock, GraduationCap, CheckCircle, ChevronLeft, Mail, DollarSign } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { HeroBackground } from "@/lib/page-hero-config";
import { getRecruitEmail } from "@/lib/brand";

interface PageProps {
  params: { slug: string };
}

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
  responsibilities: string[];
  responsibilitiesEn: string[];
  requirements: string[];
  requirementsEn: string[];
  benefits: string[];
  benefitsEn: string[];
}

export default function JobDetailClient({ params }: PageProps) {
  const { locale , t} = useI18n();
    const loc = createLocalizedGetter(locale);
  const [job, setJob] = useState<Job | null>(null);
  const [relatedJobs, setRelatedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactData, setContactData] = useState<any>(null);

  // 简历投递邮箱：DB（recruitEmails / email）优先，兜底取部署级 env；
  // 三者皆空时不渲染投递按钮（不留 mailto: 空链接）
  const recruitMail = String(contactData?.recruitEmails || contactData?.email || getRecruitEmail())
    .split(/[,，\s]+/)
    .filter(Boolean)
    .join(",");

  useEffect(() => {
    fetch(`/api/public/careers?slug=${params.slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data) => {
        setJob(data);
        setLoading(false);
      })
      .catch(() => notFound());

    fetch("/api/public/careers")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRelatedJobs(data.filter((j: Job) => j.slug !== params.slug).slice(0, 3));
        }
      })
      .catch(() => {});

    fetch("/api/public/site-config?key=contact_info", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setContactData(data.data))
      .catch(() => {});
  }, [params.slug]);

  if (loading || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-dark-400">{t("loading")}</div>
      </div>
    );
  }

  const infoItems = [
    { icon: MapPin, label: t("location"), value: loc.get(job, "location") },
    { icon: Briefcase, label: t("jobType"), value: loc.get(job, "type") },
    { icon: Clock, label: t("experience"), value: loc.get(job, "experience") },
    { icon: GraduationCap, label: t("education"), value: loc.get(job, "education") },
    { icon: DollarSign, label: t("salary"), value: loc.get(job, "salary") },
  ];

  // 职位描述兼容：数组（要点）→ 连接为一段文字；字符串 → 原样
  const formatDesc = (d: any) => (Array.isArray(d) ? d.join(" ") : d || "");

  return (
    <>
      <section className="relative pt-16 lg:pt-20 pb-12 lg:pb-16 bg-dark-900 overflow-hidden">
        <HeroBackground />
        <div className="absolute -top-1/2 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />
        <div className="container relative">
          <Link href="/careers" className="inline-flex items-center gap-1 text-dark-300 hover:text-primary text-sm mb-6 transition-colors">
            <ChevronLeft size={16} />
            {t("backToCareers")}
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs bg-primary/20 text-primary-200 px-3 py-1 rounded">{loc.get(job, "department")}</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">{loc.get(job, "title")}</h1>
          <p className="text-lg text-dark-200 max-w-2xl">{loc.getText(job, "description")}</p>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-dark mb-4">{t("jobResponsibilities")}</h2>
                <ul className="space-y-3">
                  {loc.getArray(job, "responsibilities")?.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" />
                      <span className="text-dark-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-10">
                <h2 className="text-2xl font-bold text-dark mb-4">{t("requirements")}</h2>
                <ul className="space-y-3">
                  {loc.getArray(job, "requirements")?.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" />
                      <span className="text-dark-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {loc.getArray(job, "benefits")?.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-2xl font-bold text-dark mb-4">{t("jobBenefits")}</h2>
                  <ul className="space-y-3">
                    {loc.getArray(job, "benefits")?.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" />
                        <span className="text-dark-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-dark-50 rounded-lg p-6 sticky top-8">
                <h3 className="text-lg font-bold text-dark mb-4">{t("jobInformation")}</h3>
                <div className="space-y-4">
                  {infoItems.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon size={16} className="text-primary" />
                        </div>
                        <div>
                          <div className="text-xs text-dark-400">{item.label}</div>
                          <div className="text-sm font-medium text-dark">{item.value}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t border-dark-100">
                  {recruitMail && (
                    <a
                      href={`mailto:${recruitMail}`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white px-6 py-3 rounded font-medium transition-all"
                    >
                      <Mail size={18} />
                      {t("applyPositionNow")}
                      <ArrowRight size={16} className="rtl-flip" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {relatedJobs.length > 0 && (
        <section className="py-16 lg:py-20 bg-dark-50">
          <div className="container">
            <div className="text-center mb-12">
              <div className="inline-block w-12 h-1 bg-primary mb-4" />
              <h2 className="text-3xl font-bold text-dark mb-4">{t("otherPositions")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedJobs.map((rj) => (
                <Link key={rj.id} href={`/careers/${rj.slug}`} className="group bg-white rounded-lg p-6 border border-dark-100 hover:border-primary hover:shadow-lg transition-all">
                  <div className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded inline-block mb-3">{loc.get(rj, "department")}</div>
                  <h3 className="text-lg font-bold text-dark mb-2 group-hover:text-primary transition-colors">{loc.get(rj, "title")}</h3>
                  <div className="flex items-center gap-2 text-sm text-dark-500 mb-3">
                    <MapPin size={14} />
                    <span>{loc.get(rj, "location")}</span>
                  </div>
                  <div className="text-lg font-bold text-primary">{loc.get(rj, "salary")}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
