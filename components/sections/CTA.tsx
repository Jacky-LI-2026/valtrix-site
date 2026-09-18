"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Phone, CalendarCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getContactPhone } from "@/lib/brand";

export default function CTA() {
  const { t } = useI18n();
  const [contactData, setContactData] = useState<any>(null);
  const [bookingOn, setBookingOn] = useState(true);

  // 拉取插件状态：visit-booking 停用时隐藏"考察预约"按钮
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/plugins", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && data.ok && data.state) setBookingOn(data.state["visit-booking"] !== false);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 从API获取联系信息
  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/site-config?key=contact_info", { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && data.data) {
          setContactData(data.data);
        }
      })
      .catch((err) => {
        console.warn("获取联系信息失败，使用默认数据:", err);
      });
    return () => { cancelled = true; };
  }, []);

  // 🔴 2026-09-15 G2 修复：原写法 `contactData?.phone || "<某温州区号占位号码>"` 把**别家的占位号码**
  //    写死在首页 CTA 上（该号码是本仓库此前自行写入的占位值，非本站真实联系方式），
  //    且 `contactData` 在 SSR/首次渲染时必为 null ⇒ **服务端吐出来的 HTML 里就是那个假号**。
  //    按 `lib/brand.ts` 的调用方契约：DB 优先 → 部署级环境变量兜底（**兜底故意为空串**）
  //    → 仍为空则**不渲染**电话（含不生成 `tel:` 链接），绝不退化成别人家的号码。
  //    （此处刻意不复述具体号码：注释里的字面量会让"是否仍有硬编码"的扫描永远为脏。）
  const phone = String(contactData?.phone || getContactPhone()).trim();
  const phoneHref = `tel:${phone.replace(/[\s-]/g, "")}`;

  return (
    <section className="tpl-section py-20 lg:py-24 bg-primary relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="absolute -top-1/2 -left-1/4 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-1/2 -right-1/4 w-[400px] h-[400px] bg-dark/20 rounded-full blur-3xl" />

      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="tpl-title text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{t("ctaTitle")}</h2>
          <p className="text-white/80 text-lg mb-10 leading-relaxed">{t("ctaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {bookingOn && (
              <Link
                href="/visit-booking"
                className="tpl-btn inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-3.5 rounded font-medium transition-all w-full sm:w-auto justify-center"
              >
                <CalendarCheck size={18} />
                {t("visitBooking")}
              </Link>
            )}
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white text-primary hover:bg-dark-50 px-8 py-3.5 rounded font-medium transition-all hover:gap-3 group w-full sm:w-auto justify-center"
            >
              {t("ctaButton")}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            {phone && (
              <a
                href={phoneHref}
                className="tpl-btn inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-3.5 rounded font-medium transition-all w-full sm:w-auto justify-center"
              >
                <Phone size={18} />
                <bdi dir="ltr">{phone}</bdi>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
