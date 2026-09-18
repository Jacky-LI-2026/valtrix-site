"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";

export interface SpecOption {
  label: string;
  labelEn?: string;
  price?: string; // 该选项价格分量（元），组合单价 = 基础售价 + Σ选中选项价格
}

export interface SpecDim {
  name: string;
  nameEn?: string;
  options: SpecOption[];
}

interface SpecEditorProps {
  value: SpecDim[];
  onChange: (v: SpecDim[]) => void;
}

/**
 * 商品规格编辑器（多维度规格组合定价）
 * 规则：每个维度选择一个选项，组合单价 = 基础售价(price) + Σ各维度选中选项价格(price)
 * 例：维度[净度]选项 VS=+0 / VVS=+1000；维度[重量]选项 1ct=+0 / 2ct=+3000
 *     → 组合 VS+2ct 单价 = price + 0 + 3000
 */
export default function SpecEditor({ value, onChange }: SpecEditorProps) {
  const dims: SpecDim[] = Array.isArray(value) ? value : [];

  const setDim = (i: number, d: SpecDim) =>
    onChange(dims.map((x, xi) => (xi === i ? d : x)));
  const setOpt = (i: number, oi: number, o: SpecOption) =>
    setDim(i, {
      ...dims[i],
      options: dims[i].options.map((x, xi) => (xi === oi ? o : x)),
    });

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-700">规格组合定价</div>
          <div className="mt-0.5 text-xs text-gray-400">
            组合单价 = 基础售价 + 各维度选中选项价格之和；多个维度自由组合，形成不同型号价格
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange([...dims, { name: "", nameEn: "", options: [{ label: "", labelEn: "", price: "" }] }])}
          className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" /> 添加规格维度
        </button>
      </div>

      {dims.length === 0 && (
        <div className="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-400">
          未配置规格：商品按单一售价出售（数量档位为绝对单价）
        </div>
      )}

      <div className="space-y-3">
        {dims.map((d, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-300" />
              <input
                className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                placeholder="维度名（如 净度/尺寸/功率）"
                value={d.name || ""}
                onChange={(e) => setDim(i, { ...d, name: e.target.value })}
              />
              <input
                className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                placeholder="英文名（如 Clarity/Size）"
                value={d.nameEn || ""}
                onChange={(e) => setDim(i, { ...d, nameEn: e.target.value })}
              />
              <button
                type="button"
                onClick={() => onChange(dims.filter((_, fi) => fi !== i))}
                className="ml-auto rounded p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5 pl-6">
              {d.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input
                    className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                    placeholder="选项（如 VS / 1ct）"
                    value={o.label || ""}
                    onChange={(e) => setOpt(i, oi, { ...o, label: e.target.value })}
                  />
                  <input
                    className="w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                    placeholder="英文选项"
                    value={o.labelEn || ""}
                    onChange={(e) => setOpt(i, oi, { ...o, labelEn: e.target.value })}
                  />
                  <input
                    className="w-32 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm"
                    placeholder="价格分量（元）"
                    value={o.price ?? ""}
                    onChange={(e) => setOpt(i, oi, { ...o, price: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setDim(i, { ...d, options: d.options.filter((_, fi) => fi !== oi) })}
                    className="rounded p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDim(i, { ...d, options: [...d.options, { label: "", labelEn: "", price: "" }] })}
                className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:border-primary hover:text-primary"
              >
                <Plus className="h-3 w-3" /> 添加选项
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
