"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";

interface Level {
  id: string;
  key: string;
  name: string;
  nameEn: string | null;
  nameJa: string | null;
  nameKo: string | null;
  nameFr: string | null;
  nameAr: string | null;
  threshold: number;
  discount: number;
  benefits: string | null;
  benefitsEn: string | null;
  benefitsJa: string | null;
  benefitsKo: string | null;
  benefitsFr: string | null;
  benefitsAr: string | null;
  sortOrder: number;
  isDefault: boolean;
  memberCount: number;
}

const LANGS = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "العربية" },
];

const empty = () => ({
  key: "", name: "", nameEn: "", nameJa: "", nameKo: "", nameFr: "", nameAr: "",
  threshold: 0, discount: 0, sortOrder: 0,
  benefits: "", benefitsEn: "", benefitsJa: "", benefitsKo: "", benefitsFr: "", benefitsAr: "",
});

const levelBadge = (key: string) =>
  key === "black" ? "bg-gray-900 text-white" :
  key === "gold" ? "bg-amber-100 text-amber-700" :
  key === "silver" ? "bg-slate-100 text-slate-600" :
  "bg-gray-100 text-gray-500";

export default function MemberLevelsPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Level | null>(null);
  const [form, setForm] = useState<any>(empty());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/member-levels");
      const d = await r.json();
      if (d.ok) setLevels(d.levels);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setF = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm(empty());
    setShowModal(true);
  };

  const openEdit = (lv: Level) => {
    setEditing(lv);
    setForm({
      key: lv.key, name: lv.name, nameEn: lv.nameEn || "", nameJa: lv.nameJa || "", nameKo: lv.nameKo || "", nameFr: lv.nameFr || "", nameAr: lv.nameAr || "",
      threshold: lv.threshold, discount: lv.discount, sortOrder: lv.sortOrder,
      benefits: lv.benefits || "", benefitsEn: lv.benefitsEn || "", benefitsJa: lv.benefitsJa || "", benefitsKo: lv.benefitsKo || "", benefitsFr: lv.benefitsFr || "", benefitsAr: lv.benefitsAr || "",
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setMsg("等级名称必填"); return; }
    const url = editing ? `/api/admin/member-levels/${editing.id}` : "/api/admin/member-levels";
    const r = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.ok) {
      setMsg(editing ? `已更新「${form.name}」` : `已新增「${form.name}」`);
      setShowModal(false);
      load();
    } else {
      setMsg("保存失败：" + (d.error || ""));
    }
  };

  const remove = async (lv: Level) => {
    if (!confirm(`确认删除等级「${lv.name}」？`)) return;
    const r = await fetch(`/api/admin/member-levels/${lv.id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.ok) {
      setMsg(`已删除「${lv.name}」`);
      load();
    } else {
      setMsg("删除失败：" + (d.error || ""));
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">会员等级与权益</h1>
          <p className="text-sm text-gray-500 mt-1">配置等级门槛（积分）、折扣与权益说明；会员积分可在会员详情中调整</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1 bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700">
          <Plus size={16} /> 新增等级
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-700 text-sm border border-green-200">{msg}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400">加载中...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {levels.map((lv) => (
            <div key={lv.id} className="bg-white rounded-lg border p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-xs font-medium ${levelBadge(lv.key)}`}>{lv.name}</span>
                  <span className="text-xs text-gray-400">{lv.key}</span>
                  {lv.isDefault && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">默认等级</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(lv)} className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                    <Pencil size={14} /> 编辑
                  </button>
                  {!lv.isDefault && (
                    <button onClick={() => remove(lv)} className="text-red-500 hover:underline text-sm flex items-center gap-1">
                      <Trash2 size={14} /> 删除
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                <div className="bg-gray-50 rounded p-2.5">
                  <div className="text-xs text-gray-400">升级门槛</div>
                  <div className="font-semibold mt-0.5">{lv.threshold.toLocaleString()} 积分</div>
                </div>
                <div className="bg-gray-50 rounded p-2.5">
                  <div className="text-xs text-gray-400">商城折扣</div>
                  <div className="font-semibold mt-0.5">{lv.discount > 0 ? `${lv.discount}% off` : "无"}</div>
                </div>
                <div className="bg-gray-50 rounded p-2.5">
                  <div className="text-xs text-gray-400">会员数</div>
                  <div className="font-semibold mt-0.5">{lv.memberCount} 人</div>
                </div>
              </div>

              <div className="text-xs text-gray-500 whitespace-pre-line leading-relaxed bg-white border rounded p-3 max-h-28 overflow-y-auto">
                {lv.benefits || "暂无权益说明"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? `编辑等级：${editing.name}` : "新增等级"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">等级 key（小写英文，创建后不可改）</div>
                <input className="border rounded px-3 py-2 text-sm w-full disabled:bg-gray-100" value={form.key}
                  disabled={!!editing} onChange={(e) => setF("key", e.target.value)} placeholder="如 vip-platinum" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">升级门槛（积分）</div>
                  <input type="number" min={0} className="border rounded px-3 py-2 text-sm w-full" value={form.threshold}
                    onChange={(e) => setF("threshold", Number(e.target.value) || 0)} />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">商城折扣（%）</div>
                  <input type="number" min={0} max={100} className="border rounded px-3 py-2 text-sm w-full" value={form.discount}
                    onChange={(e) => setF("discount", Number(e.target.value) || 0)} />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1">等级名称（多语言）</div>
              <div className="space-y-2">
                {LANGS.map((l) => (
                  <div key={l.code} className="flex items-center gap-2">
                    <span className="w-20 text-xs text-gray-400">{l.label}</span>
                    <input className="border rounded px-3 py-1.5 text-sm flex-1"
                      value={form[l.code === "zh" ? "name" : "name" + l.code.charAt(0).toUpperCase() + l.code.slice(1)] || ""}
                      onChange={(e) => setF(l.code === "zh" ? "name" : "name" + l.code.charAt(0).toUpperCase() + l.code.slice(1), e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1">权益说明（多语言，每行一条）</div>
              <div className="space-y-2">
                {LANGS.map((l) => (
                  <div key={l.code} className="flex items-start gap-2">
                    <span className="w-20 text-xs text-gray-400 pt-2">{l.label}</span>
                    <textarea rows={3} className="border rounded px-3 py-1.5 text-sm flex-1"
                      value={form[l.code === "zh" ? "benefits" : "benefits" + l.code.charAt(0).toUpperCase() + l.code.slice(1)] || ""}
                      onChange={(e) => setF(l.code === "zh" ? "benefits" : "benefits" + l.code.charAt(0).toUpperCase() + l.code.slice(1), e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="border rounded px-5 py-2 text-sm text-gray-600">取消</button>
              <button onClick={save} className="bg-blue-600 text-white px-6 py-2 text-sm rounded hover:bg-blue-700">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
