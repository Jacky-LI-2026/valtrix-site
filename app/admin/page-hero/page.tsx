"use client";

import { useState, useEffect } from "react";
import { Save, Plus, Trash2, Image as ImageIcon, Palette, Sliders, Eye } from "lucide-react";

interface HeroConfig {
  backgroundImage?: string;
  overlayColor: string;
  overlayOpacity: number;
  gradientEnabled: boolean;
  gradientDirection: string;
  gradientColor2: string;
  patternEnabled: boolean;
}

const DEFAULT_CONFIG: HeroConfig = {
  overlayColor: "#0a0a0a",
  overlayOpacity: 0.85,
  gradientEnabled: false,
  gradientDirection: "to-bottom",
  gradientColor2: "#1a1a2e",
  patternEnabled: true,
};

const GRADIENT_DIRECTIONS = [
  { value: "to-bottom", label: "从上到下" },
  { value: "to-top", label: "从下到上" },
  { value: "to-left", label: "从右到左" },
  { value: "to-right", label: "从左到右" },
  { value: "to-bottom-right", label: "左上到右下" },
  { value: "to-bottom-left", label: "右上到左下" },
];

// CSS 渐变方向映射
const GRADIENT_DIR_CSS: Record<string, string> = {
  "to-bottom": "to bottom",
  "to-top": "to top",
  "to-left": "to left",
  "to-right": "to right",
  "to-bottom-right": "to bottom right",
  "to-bottom-left": "to bottom left",
};

// hex 转 rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 常用页面路径
const PRESET_PATHS = [
  "/products",
  "/industries",
  "/services",
  "/resources",
  "/news",
  "/about",
  "/careers",
  "/contact",
  "/quote/cart",
  "/quote/success",
];

export default function PageHeroConfig() {
  const [configs, setConfigs] = useState<Record<string, HeroConfig>>({});
  const [newPath, setNewPath] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const res = await fetch("/api/admin/site-config");
      const data = await res.json();
      const raw = data?.page_hero_config;
      if (raw) {
        setConfigs(typeof raw === 'string' ? JSON.parse(raw) : raw);
      }
    } catch (e) {
      console.error("加载配置失败:", e);
    }
  };

  const saveConfigs = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_hero_config: configs }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert("保存失败");
    }
    setSaving(false);
  };

  const addConfig = (path: string) => {
    if (!path || configs[path]) return;
    setConfigs({ ...configs, [path]: { ...DEFAULT_CONFIG } });
    setNewPath("");
    setEditingPath(path);
  };

  const updateConfig = (path: string, updates: Partial<HeroConfig>) => {
    setConfigs({
      ...configs,
      [path]: { ...configs[path], ...updates },
    });
  };

  const deleteConfig = (path: string) => {
    const next = { ...configs };
    delete next[path];
    setConfigs(next);
    if (editingPath === path) setEditingPath(null);
  };

  const handleImageUpload = async (path: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data?.url) {
        updateConfig(path, { backgroundImage: data.url });
      }
    } catch (e) {
      alert("图片上传失败");
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-gray-900">页面头部配置</h1>
          <p className="text-gray-500 text-sm mt-1">为各页面顶部深色区域配置背景图和遮罩层</p>
        </div>
        <button
          onClick={saveConfigs}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "保存中..." : saved ? "已保存" : "保存全部"}
        </button>
      </div>

      {/* 添加新页面 */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="输入页面路径，如 /industries/jewelry"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && addConfig(newPath)}
          />
          <button
            onClick={() => addConfig(newPath)}
            className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm"
          >
            <Plus size={14} /> 添加
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {PRESET_PATHS.filter((p) => !configs[p]).map((p) => (
            <button
              key={p}
              onClick={() => addConfig(p)}
              className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded hover:bg-gray-100 border"
            >
              + {p}
            </button>
          ))}
        </div>
      </div>

      {/* 配置列表 */}
      <div className="space-y-4">
        {Object.entries(configs).map(([path, cfg]) => (
          <div key={path} className="bg-white rounded-lg border overflow-hidden">
            {/* 标题栏 */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b cursor-pointer"
              onClick={() => setEditingPath(editingPath === path ? null : path)}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium text-gray-800">{path}</span>
                {cfg.backgroundImage && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">有背景图</span>}
                {cfg.gradientEnabled && <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">渐变</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConfig(path); }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 size={14} />
                </button>
                <Eye size={14} className={`text-gray-400 transition-transform ${editingPath === path ? "rotate-180" : ""}`} />
              </div>
            </div>

            {/* 编辑区域 */}
            {editingPath === path && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左侧：背景图 */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <ImageIcon size={14} /> 背景图片
                    <span className="text-xs text-gray-400 font-normal">（推荐 1920×600，约 16:5；支持 JPG/PNG/WebP，上传后自动压缩为 WebP）</span>
                  </label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {cfg.backgroundImage ? (
                      <div className="relative">
                        <img src={cfg.backgroundImage} alt="背景预览" className="w-full h-32 object-cover rounded" />
                        <button
                          onClick={() => updateConfig(path, { backgroundImage: undefined })}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <div className="text-gray-400 text-sm py-6">点击上传背景图</div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(path, e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* 右侧：遮罩配置 */}
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Palette size={14} /> 遮罩颜色
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={cfg.overlayColor}
                        onChange={(e) => updateConfig(path, { overlayColor: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border"
                      />
                      <input
                        type="text"
                        value={cfg.overlayColor}
                        onChange={(e) => updateConfig(path, { overlayColor: e.target.value })}
                        className="flex-1 border rounded px-2 py-1 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <Sliders size={14} /> 遮罩透明度: {Math.round(cfg.overlayOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={cfg.overlayOpacity}
                      onChange={(e) => updateConfig(path, { overlayOpacity: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">启用渐变</label>
                    <button
                      onClick={() => updateConfig(path, { gradientEnabled: !cfg.gradientEnabled })}
                      className={`w-10 h-6 rounded-full transition-colors ${cfg.gradientEnabled ? "bg-blue-600" : "bg-gray-300"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${cfg.gradientEnabled ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </div>

                  {cfg.gradientEnabled && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">渐变方向</label>
                        <select
                          value={cfg.gradientDirection}
                          onChange={(e) => updateConfig(path, { gradientDirection: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          {GRADIENT_DIRECTIONS.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">渐变结束颜色</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={cfg.gradientColor2}
                            onChange={(e) => updateConfig(path, { gradientColor2: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer border"
                          />
                          <input
                            type="text"
                            value={cfg.gradientColor2}
                            onChange={(e) => updateConfig(path, { gradientColor2: e.target.value })}
                            className="flex-1 border rounded px-2 py-1 text-sm font-mono"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">显示网格图案</label>
                    <button
                      onClick={() => updateConfig(path, { patternEnabled: !cfg.patternEnabled })}
                      className={`w-10 h-6 rounded-full transition-colors ${cfg.patternEnabled ? "bg-blue-600" : "bg-gray-300"}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${cfg.patternEnabled ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>

                {/* 预览 */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">实时预览</label>
                  <div
                    className="relative h-40 rounded-lg overflow-hidden flex items-end p-4"
                    style={{
                      backgroundImage: cfg.backgroundImage ? `url(${cfg.backgroundImage})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundColor: "#0a0a0a",
                    }}
                  >
                    {/* 遮罩层 */}
                    <div
                      className="absolute inset-0"
                      style={
                        cfg.gradientEnabled
                          ? {
                              background: `linear-gradient(${GRADIENT_DIR_CSS[cfg.gradientDirection] || "to bottom"}, ${hexToRgba(cfg.overlayColor, cfg.overlayOpacity)}, ${hexToRgba(cfg.gradientColor2, cfg.overlayOpacity)})`,
                            }
                          : { backgroundColor: hexToRgba(cfg.overlayColor, cfg.overlayOpacity) }
                      }
                    />
                    {/* 网格图案 */}
                    {cfg.patternEnabled && (
                      <div
                        className="absolute inset-0 opacity-5"
                        style={{
                          backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                          backgroundSize: "50px 50px",
                        }}
                      />
                    )}
                    <div className="relative z-10">
                      <div className="w-8 h-0.5 bg-red-500 mb-2" />
                      <h3 className="text-white text-xl font-bold">页面标题示例</h3>
                      <p className="text-gray-300 text-sm">页面副标题示例文字</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {Object.keys(configs).length === 0 && (
        <div className="text-center py-12 text-gray-400">
          暂无配置，添加页面路径开始配置
        </div>
      )}
    </div>
  );
}
