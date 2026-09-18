"use client";

/**
 * 通用表单渲染器（前台）
 * 根据 FormDefinition.fields 动态渲染，提交到 /api/public/forms/[slug]
 */
import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

interface FieldDef {
  key: string;
  label?: { zh?: string; en?: string };
  type: string;
  required?: boolean;
  options?: { label?: { zh?: string }; value?: string }[] | { label?: string; value?: string }[];
  placeholder?: string;
}

export default function FormRenderer({ form }: { form: any }) {
  const slug = form.slug;
  const fields: FieldDef[] = Array.isArray(form.fields) ? form.fields : [];
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submitLabel = (form.submitLabel as any)?.zh || "提交";

  const set = (k: string, v: any) => setValues((prev) => ({ ...prev, [k]: v }));

  const labelOf = (f: FieldDef) => f.label?.zh || f.label?.en || f.key;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMsg(null);
    try {
      const r = await fetch(`/api/public/forms/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ ok: false, text: d.error || "提交失败" }); return; }
      setMsg({ ok: true, text: "提交成功，我们会尽快与您联系！" });
      setValues({});
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || "网络异常" });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((f) => {
        const base = labelOf(f);
        const label = f.required ? <span>{base} <span className="text-red-500">*</span></span> : base;
        return (
          <div key={f.key} className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            {f.type === "textarea" && (
              <textarea value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} rows={4} placeholder={f.placeholder} className={inputCls} />
            )}
            {f.type === "select" && (
              <select value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} className={inputCls}>
                <option value="">请选择</option>
                {(f.options || []).map((o: any, i: number) => (
                  <option key={i} value={o.value ?? o.label?.zh ?? o.label}>{o.label?.zh ?? o.label}</option>
                ))}
              </select>
            )}
            {(f.type === "radio" || f.type === "checkbox") && (
              <div className="space-y-1.5">
                {(f.options || []).map((o: any, i: number) => {
                  const v = o.value ?? o.label?.zh ?? o.label;
                  const checked = Array.isArray(values[f.key]) ? (values[f.key] as string[]).includes(v) : values[f.key] === v;
                  const toggle = () => {
                    if (f.type === "radio") { set(f.key, v); return; }
                    const cur: string[] = Array.isArray(values[f.key]) ? values[f.key] as string[] : [];
                    set(f.key, checked ? cur.filter((x) => x !== v) : [...cur, v]);
                  };
                  return (
                    <label key={i} className="flex items-center gap-2 cursor-pointer">
                      <input type={f.type} checked={checked} onChange={toggle} className="w-4 h-4" />
                      <span className="text-sm text-gray-700">{o.label?.zh ?? o.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {(f.type === "text" || f.type === "email" || f.type === "tel" || f.type === "date" || !f.type) && (
              <input
                type={f.type === "date" ? "date" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
                value={values[f.key] || ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={inputCls}
              />
            )}
          </div>
        );
      })}

      {msg && (
        <div className={`flex items-center gap-2 text-sm rounded px-3 py-2 text-left ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {msg.ok && <CheckCircle2 size={15} />}
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
        {submitting ? "提交中..." : submitLabel}
      </button>
    </form>
  );
}
