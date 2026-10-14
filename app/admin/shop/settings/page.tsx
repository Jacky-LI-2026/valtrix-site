"use client";

import { useEffect, useState } from "react";
import UrlUploadInput from "@/components/admin/UrlUploadInput";

/**
 * 商城设置（收款管理）
 * ==========================================================================
 * owner 2026-10-14：「收款管理不要放在商品管理内，单独一页或放在商城设置内」
 *
 * 为什么独立成页：
 *   · 语义上它是**整站收款配置**，与"某个商品怎么编辑"无关，挂在商品管理页尾
 *     （一个 36 KB 的商品列表 + 新增/编辑弹窗的页面）既难找也容易被误当成商品字段；
 *   · 权限粒度不同：商品管理要 `product:view`（内容维护人员也有），
 *     而收款信息涉及**银行账号与收款码**，保存要 `config:site`（管理员级）。
 *     分页后页面权限与保存权限**同码**，不会再出现"能进页面、点了保存 403"。
 *
 * 数据仍存在既有的 `site_config.shop_bank_info`（**未加表、未加列**）：
 *   老键 `accountName/bankName/accountNo/branch/remark` 一字不改 ⇒ 订单页既有读取逻辑不受影响；
 *   新增 `methods`（收款方式开关）、`wechatQr/alipayQr`（收款码）、`instructions(_En)`（前台说明）。
 *
 * 前台消费方：`/shop/checkout`（只列勾选的收款方式）、`/shop/order/[orderNo]`（账户 / 收款码 / 说明）。
 */
export default function AdminShopSettingsPage() {
  const [bankInfo, setBankInfo] = useState<any>({});
  const [bankMsg, setBankMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/site-config")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.config && d.config.shop_bank_info) setBankInfo(d.config.shop_bank_info);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveBankInfo() {
    const r = await fetch("/api/admin/site-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_bank_info: bankInfo }),
    });
    const d = await r.json().catch(() => ({}));
    setBankMsg(d.error ? "保存失败：" + d.error : "已保存");
    setTimeout(() => setBankMsg(""), 3000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">商城设置</h1>
          <p className="mt-1 text-xs text-gray-400">在线商城插件 · 收款方式 / 对公账户 / 收款码 —— 保存后结算页与订单页立即生效</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-1 text-base font-semibold">收款管理</h3>
        <p className="mb-4 text-xs text-gray-400">
          ① 勾选客户可用的收款方式（结算页只显示勾选项）② 对公转账账户 ③ 微信/支付宝收款码（可上传图片）④ 前台说明 —— 保存后结算页与订单页立即生效
        </p>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">加载中…</div>
        ) : (
          <>
            {/* 收款方式开关 */}
            <div className="mb-4 flex flex-wrap items-center gap-5 rounded-lg bg-gray-50 px-3 py-2.5">
              {[
                { key: "bank", label: "对公转账" },
                { key: "offline", label: "线下转账" },
                { key: "wechat", label: "微信支付" },
                { key: "alipay", label: "支付宝" },
                { key: "contact", label: "联系客服" },
              ].map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={bankInfo?.methods?.[m.key] !== false}
                    onChange={(e) =>
                      setBankInfo((b: any) => ({ ...b, methods: { ...(b?.methods || {}), [m.key]: e.target.checked } }))
                    }
                  />
                  {m.label}
                </label>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-600">收款单位</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.accountName || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, accountName: e.target.value }))} placeholder="如：北京VALTRIX Co., Ltd." />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">开户银行</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.bankName || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, bankName: e.target.value }))} placeholder="如：招商银行北京分行" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">银行账号</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.accountNo || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, accountNo: e.target.value }))} placeholder="对公账号" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">开户支行</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.branch || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, branch: e.target.value }))} placeholder="选填" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-600">转账备注</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.remark || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, remark: e.target.value }))} placeholder="如：转账请备注订单号" />
              </div>
              {/* 收款码（上传图片；前台选微信/支付宝时展示） */}
              <UrlUploadInput
                label="微信收款码（选填）"
                value={bankInfo.wechatQr || ""}
                onChange={(url) => setBankInfo((b: any) => ({ ...b, wechatQr: url }))}
                accept="image/*"
                showPreview
              />
              <UrlUploadInput
                label="支付宝收款码（选填）"
                value={bankInfo.alipayQr || ""}
                onChange={(url) => setBankInfo((b: any) => ({ ...b, alipayQr: url }))}
                accept="image/*"
                showPreview
              />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-600">前台说明（中文）</label>
                <textarea rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.instructions || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, instructions: e.target.value }))} placeholder="如：付款后请上传凭证，我们会在 1 个工作日内确认到账" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm text-gray-600">前台说明（英文）</label>
                <textarea rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bankInfo.instructionsEn || ""} onChange={(e) => setBankInfo((b: any) => ({ ...b, instructionsEn: e.target.value }))} placeholder="e.g. Upload the payment receipt after paying; we will confirm within 1 business day." />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={saveBankInfo} className="rounded-lg px-5 py-2 text-sm font-medium text-white" style={{ background: "var(--color-primary, #CC0000)" }}>保存收款设置</button>
              {bankMsg && <span className="text-xs text-green-600">{bankMsg}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
