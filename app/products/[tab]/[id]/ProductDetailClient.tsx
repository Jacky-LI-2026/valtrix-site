"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle, ChevronLeft, ChevronRight, Phone, Mail, Download, FileText, RotateCw, Hand, ShoppingCart, Heart, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createLocalizedGetter } from "@/lib/localized";
import { preserveLeadingSpaces } from "@/lib/rich-text";
import { useCanSocialPublish } from "@/lib/api/useSocialPublish";
import { groupSpecs } from "@/lib/spec-grouping";
import { useProductBySlug } from "@/lib/api/useProducts";
import ThreeSixtyViewer from "@/components/ui/ThreeSixtyViewer";
import DownloadGateButton from "@/components/ui/DownloadGateButton";
import RecommendBox from "@/components/RecommendBox";
import { HeroBackground } from "@/lib/page-hero-config";
import PriceDisplay, { usePricingContext } from "@/components/PriceDisplay";
import { getContactEmail, getContactPhone } from "@/lib/brand";

const DEFAULT_MANUAL_URL = "/downloads/valtrix-product-catalog-2026.pdf";
const DRAG_THRESHOLD = 100; // 拖拽切换图片的阈值（像素），释放时超过此距离才切换

export default function ProductDetailClient() {
  const params = useParams();
  const { t, locale } = useI18n();
  const loc = createLocalizedGetter(locale);
  const pricing = usePricingContext(locale);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"360" | "static">("static"); // 视图模式：默认静态图，360为可选

  // 拖拽旋转相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [showDragHint, setShowDragHint] = useState(true);
  const [isHovering, setIsHovering] = useState(false); // 鼠标悬浮状态
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [contactData, setContactData] = useState<any>(null); // 鼠标在图片上的相对位置(0-1)
  const [manualOk, setManualOk] = useState<boolean | null>(null); // 产品手册文件是否存在（HEAD 检测）
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const modelId = params?.id as string;
  // ⚠️ 2026-09-18：**不再拉全量产品树**。
  //   本页原先以全量产品树为**主**数据源（型号/分类/系列/相关产品都从树里找），
  //   而那棵树含全部型号的六语种正文（约 64% 体积）。
  //   现改为：详情接口为唯一数据源 —— 它已自带 tab / category / specs / features /
  //   detailContent / price / priceTiers / purchaseMode / shopSlug / video / related
  //   （后几项是本次一并补齐的，此前只有列表接口才返回）。
  //   `useProductBySlug` 的首帧初值取自静态数据，故仍然**首帧即渲染**、无加载骨架。
  const { product: productDetail, loading: detailLoading } = useProductBySlug(modelId);

  const dp: any = productDetail;
  const model = dp;
  const category = dp?.category;
  const tab = dp?.tab;
  const productInfo: { model: any; category: any; tab: any } | null =
    dp && dp.tab && dp.category ? { model: dp, category: dp.category, tab: dp.tab } : null;
  /**
   * 图集来源：只有详情接口返回的图集才算数（owner 2026-09-26：首帧会渲染静态兜底里的
   * 别的机型照片当"占位缩略图"）。加载中只给中性占位图，不出缩略图。
   */
  /**
   * owner 2026-10-01（阀门站报障）：刷新详情页时**会先闪一张占位图**。
   * 根因：加载窗口里这里被硬塞了 `["/placeholders/generic-tech.webp"]`，
   *   而占位图与真实产品图差别极大 ⇒ 视觉上是"先读到了错图"。
   * 现口径：**加载期间一张图都不出**（主图区给骨架块），真实图集到达后才渲染；
   *   只有在"确实加载完了、这个型号也真的没有图"时，才退回型号首字母占位块。
   */
  const imagesRaw =
    !detailLoading && Array.isArray(model?.images) && model.images.length > 0
      ? model.images
      : !detailLoading && model?.image
        ? [model.image]
        : [];
  const images = (Array.isArray(imagesRaw) ? imagesRaw : [])
    .map((x: any) => (typeof x === "string" ? x : x?.url || ""))
    .filter(Boolean);

  // 规格表按 label 分组（同 label 多尺寸值合并 label 单元格，rowSpan 跨行）
  const specsArray =
    productDetail?.specs && productDetail.specs.length > 0
      ? productDetail.specs
      : model?.specs || [];
  const groupedSpecs = groupSpecs(specsArray, loc);

  // ---- 询价车（RFQ 自动报价）----
  const [quoteQty, setQuoteQty] = useState(1);
  const [cartAdded, setCartAdded] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // ---- 会员收藏 ----
  const [favState, setFavState] = useState<"unknown" | "no" | "yes">("unknown");
  /** 是否显示「发布到社媒」（仅登录且有发布权限的后台用户） */
  const canSocialPublish = useCanSocialPublish();

  useEffect(() => {
    let cancelled = false;
    const pid = model?.id;
    if (!pid) return;
    fetch("/api/public/member")
      .then((r) => r.json())
      .then(async (d) => {
        if (cancelled) return;
        if (!d || !d.ok) { setFavState("no"); return; }
        const fr = await fetch("/api/public/member?action=favorites");
        const fd = await fr.json();
        if (cancelled) return;
        const favs: any[] = fd?.favorites || [];
        setFavState(favs.some((f) => String(f.productId) === String(pid)) ? "yes" : "no");
      })
      .catch(() => { if (!cancelled) setFavState("no"); });
    return () => { cancelled = true; };
  }, [model?.id]);

  const toggleFavorite = async () => {
    const pid = model?.id;
    if (!pid) return;
    if (favState === "unknown") return;
    if (favState === "no") {
      const r = await fetch(`/api/public/member/favorites/${pid}`, { method: "POST" });
      const d = await r.json();
      if (d && d.ok) setFavState("yes");
      else if (r.status === 401) window.location.href = "/member/login";
    } else {
      await fetch(`/api/public/member/favorites/${pid}`, { method: "DELETE" });
      setFavState("no");
    }
  };

  // 实时读取询价车数量（响应加入/移除/跨页同步）
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("quote_cart");
        const arr = raw ? JSON.parse(raw) : [];
        setCartCount(Array.isArray(arr) ? arr.length : 0);
      } catch {
        setCartCount(0);
      }
    };
    read();
    window.addEventListener("quote-cart-updated", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("quote-cart-updated", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  useEffect(() => {
    if (model?.moq) setQuoteQty(Number(model.moq) || 1);
  }, [model?.id]);

  const addToCart = () => {
    const key = "quote_cart";
    let cart: { id: string; qty: number }[] = [];
    try {
      const raw = localStorage.getItem(key);
      cart = raw ? JSON.parse(raw) : [];
    } catch (e) {
      cart = [];
    }
    if (!Array.isArray(cart)) cart = [];
    const qty = Math.max(1, quoteQty || 1);
    const exist = cart.find((x) => x.id === modelId);
    if (exist) exist.qty = qty;
    else cart.push({ id: modelId, qty });
    localStorage.setItem(key, JSON.stringify(cart));
    setCartAdded(true);
    setCartCount(cart.length);
    // 通知其他组件（Header 徽标等）同步
    try {
      window.dispatchEvent(new Event("quote-cart-updated"));
    } catch (e) {
      /* ignore */
    }
    setTimeout(() => setCartAdded(false), 2500);
  };

  const priceRangeText = (() => {
    if (!model) return "";
    const min = model.priceMin !== null && model.priceMin !== undefined ? Number(model.priceMin) : null;
    const max = model.priceMax !== null && model.priceMax !== undefined ? Number(model.priceMax) : null;
    const unit = model.priceUnit || "元/台";
    if (min && max && min > 0 && max > 0) {
      return `${t("referencePrice")}: ¥${min.toLocaleString()} - ¥${max.toLocaleString()} ${unit}`;
    }
    if (min && min > 0) {
      return `${t("referencePrice")}: ¥${min.toLocaleString()} ${unit} 起`;
    }
    return "";
  })();
  const priceNoteText = model?.priceNote ? String(model.priceNote) : "";
  const moqNum = Number(model?.moq) || 1;

  // 取图片字符串 URL（兼容字符串/对象/数组）
  const getImgStr = (x: any): string => {
    if (!x) return "";
    if (typeof x === "string") return x;
    if (Array.isArray(x)) return getImgStr(x[0]);
    if (typeof x === "object") return typeof x.url === "string" ? x.url : "";
    return "";
  };
  // 缩略图 URL：一律指向 **`_thumb.webp`**
  //
  // 🔴 2026-09-18 修复（线上实测：每张图先 404 再回退）：
  //   此前按**原扩展名**推导（`x.jpg → x_thumb.jpg`、`x.png → x_thumb.png`），
  //   而上传管线 `app/api/admin/upload/route.ts` 产出的缩略图**永远是 `.webp`**
  //   （`thumbName = ${baseName}_thumb.webp`）⇒ 两边约定不一致，前端请求的
  //   `x_thumb.jpg` 在服务器上根本不存在，只能靠 onError 回退到原图（多一次 404 + 加载大图）。
  //   现统一为 `.webp`，并顺手只对 `/uploads/` 路径推导 —— 静态图（/images/**、占位图）
  //   本身已是优化过的资源，不该再拼 `_thumb`。
  const toThumbUrl = (src: string) => {
    if (!src || src.startsWith("placeholder-") || src.startsWith("http")) return src;
    if (!src.startsWith("/uploads/")) return src; // 静态资源不做缩略图推导
    const dot = src.lastIndexOf(".");
    if (dot === -1) return src;
    const ext = src.slice(dot).toLowerCase();
    if (ext === ".svg" || ext === ".gif") return src; // 矢量/动画不生成缩略图
    return src.slice(0, dot) + "_thumb.webp";
  };
  const currentImage = images[currentImageIndex] || images[0] || "";
  const manualUrl = model?.manualUrl || DEFAULT_MANUAL_URL;
  // 相关产品：来自详情接口的 `related`（服务端按站点过滤、排序，最多 6 条）。
  // 老写法 `category.models.filter(...)` 依赖全量树里的分类对象，已不再适用。
  const relatedModels = (Array.isArray(dp?.related) ? dp.related : []).slice(0, 3);

  function nextImage() {
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }

  function prevImage() {
    if (images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }

  // 拖拽开始
  const handleDragStart = useCallback((clientX: number) => {
    if (images.length <= 1) return;
    setIsDragging(true);
    setDragStartX(clientX);
    setDragOffset(0);
    setShowDragHint(false);
  }, [images.length]);

  // 拖拽移动 - 只更新偏移量，不实时切换图片
  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    const delta = clientX - dragStartX;
    setDragOffset(delta);
  }, [isDragging, dragStartX]);

  // 拖拽结束 - 根据总位移决定是否切换图片
  const handleDragEnd = useCallback(() => {
    if (isDragging && images.length > 1) {
      if (dragOffset > DRAG_THRESHOLD) {
        prevImage();
      } else if (dragOffset < -DRAG_THRESHOLD) {
        nextImage();
      }
    }
    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, dragOffset, images.length]);

  // 全局鼠标up事件
  useEffect(() => {
    if (isDragging) {
      const globalMouseUp = () => handleDragEnd();
      window.addEventListener("mouseup", globalMouseUp);
      return () => window.removeEventListener("mouseup", globalMouseUp);
    }
  }, [isDragging, handleDragEnd]);

  // 检测产品手册 PDF 是否存在（HEAD），不存在则隐藏下载按钮显示"暂无资料"
  useEffect(() => {
    let cancelled = false;
    const url = model?.manualUrl || DEFAULT_MANUAL_URL;
    if (!url) { setManualOk(false); return; }
    fetch(url, { method: "HEAD" })
      .then((r) => { if (!cancelled) setManualOk(r.ok); })
      .catch(() => { if (!cancelled) setManualOk(false); });
    return () => { cancelled = true; };
  }, [model?.id, model?.manualUrl]);

  // 数据还没回来 → 加载态（静态数据里也没有该型号时才会出现；
  // 有静态兜底时首帧就有值，走不到这里）
  if (!model && detailLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!productInfo || !model || !category || !tab) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark mb-4">
            {t("productNotFound")}
          </h1>
          <Link href="/products" className="text-primary hover:underline">
            {t("backToProducts")}
          </Link>
        </div>
      </div>
    );
  }

  const detailContent = loc.get(model, "detailContent");

  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
    // 更新鼠标在图片上的相对位置（用于放大镜效果）
    if (imageContainerRef.current) {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
    }
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) handleDragEnd();
  };

  // 触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // 计算图片transform：拖拽时跟随位移，悬浮时放大镜效果(放大2倍+平移到鼠标位置)
  const imageTransform = isDragging
    ? `translateX(${dragOffset * 0.6}px) scale(0.97)`
    : isHovering
      ? `translate(${-mousePos.x * 50}%, ${-mousePos.y * 50}%) scale(2)`
      : "translate(0, 0) scale(1)";

  // 联系方式：DB contact_info 优先，兜底取部署级 env；两者皆空时不渲染该项（不留 tel:/mailto: 空链接）
  const phone = String(contactData?.phone || getContactPhone()).trim();
  const email = String(contactData?.email || getContactEmail()).trim();

  return (
    <div className="bg-white min-h-screen">
      {/* Page Hero */}
      <section className="relative pt-16 lg:pt-20 pb-12 lg:pb-16 bg-dark-900 overflow-hidden">
        <HeroBackground />
        <div className="absolute -top-1/2 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl" />
        <div className="container relative">
          <nav className="flex items-center gap-1 text-sm text-dark-300 flex-wrap mb-4">
            <Link href="/" className="hover:text-white transition-colors">
              {t("home")}
            </Link>
            <ChevronRight size={14} className="rtl-flip" />
            <Link href="/products" className="hover:text-white transition-colors">
              {t("products")}
            </Link>
            <ChevronRight size={14} className="rtl-flip" />
            <Link href="/products" className="text-white/80 hover:text-white transition-colors">{loc.get(category, "name")}</Link>
            <ChevronRight size={14} className="rtl-flip" />
            <span className="text-white font-medium">{model.model}</span>
          </nav>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            {loc.get(model, "name")}
          </h1>
          <p className="text-lg text-white/80">{model.model}</p>
        </div>
      </section>

      {/* Product Main Section */}
      <section className="py-12 lg:py-16">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Image Gallery with 360 Drag Rotation */}
            <div className="lg:sticky lg:top-24">
              {/* 主图区域：有360配置且视图模式为360时显示360旋转查看器，否则显示普通可拖拽主图 */}
              {model.frames360 && viewMode === "360" ? (
                <ThreeSixtyViewer
                  imagePathTemplate={model.frames360.path || model.frames360.template || model.frames360.url || `/images/360/${model?.id || ''}/Frame{index}.png`}
                  totalFrames={model.frames360.count || model.frames360.totalFrames || model.frames360.frames || 60}
                  startIndex={model.frames360.startIndex || 1}
                  autoRotate={true}
                  autoRotateSpeed={100}
                  className="border border-dark-100"
                />
              ) : (
              <>
              {/*
                Main Image - Draggable 360 View
                正方形 1:1（owner 2026-09-21：「把产品图片和360旋转设置为正方形比例」，左文站同步到阀门站）。
                原来是 4:3：与 360 查看器（现 1:1）高度不一致，切换视图会跳；缩略图本来就是 1:1，改成正方形后整列对齐。
              */}
              <div
                ref={imageContainerRef}
                className={`relative bg-dark-50 rounded-lg overflow-hidden aspect-square border border-dark-100 select-none ${
                  isDragging ? "cursor-grabbing" : isHovering ? "cursor-zoom-in" : "cursor-default"
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => { handleMouseLeave(); setIsHovering(false); }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {detailLoading ? (
                  /* 加载中：中性骨架（不再放占位图，避免"先读到一张错图"） */
                  <div className="w-full h-full bg-gradient-to-br from-dark-50 to-dark-100 animate-pulse" />
                ) : currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImage}
                    alt={`${model.name} - ${model.model} - ${t("view")} ${currentImageIndex + 1}`}
                    /* 铺满正方形主图区（产品图为 1000×1000 方图 ⇒ 不裁切） */
                    className="w-full h-full object-cover transition-transform"
                    style={{ transform: imageTransform, transitionDuration: isDragging || isHovering ? "0ms" : "200ms" }}
                    draggable={false}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-2xl">{model.model.charAt(0)}</span>
                      </div>
                      <p className="text-dark-400 text-sm">{model.model}</p>
                    </div>
                  </div>
                )}

                {/* Navigation Arrows */}
                {images.length > 1 && !isDragging && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors z-10"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={20} className="text-dark-700" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors z-10"
                      aria-label="Next image"
                    >
                      <ChevronRight size={20} className="rtl-flip text-dark-700" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {images.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}

                {/* Model Badge */}
                <div className="absolute top-4 left-4 bg-primary text-white text-sm font-bold px-3 py-1.5 rounded shadow">
                  {model.model}
                </div>

                {/* Drag progress indicator */}
                {isDragging && Math.abs(dragOffset) > 10 && (
                  <div className="absolute bottom-3 left-3 right-16 h-1 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(Math.abs(dragOffset) / DRAG_THRESHOLD * 100, 100)}%`,
                        marginLeft: dragOffset < 0 ? "auto" : 0,
                      }}
                    />
                  </div>
                )}
              </div>
              </>
              )}

                            {/* Thumbnails - 缩略图导航：360入口独立，后面跟产品图片缩略图 */}
              {(model.frames360 || images.length > 1) && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {/* 360度视图入口（独立，不占用产品图片位置，背景用第一张产品图） */}
                  {model.frames360 && (
                    <button
                      onClick={() => setViewMode("360")}
                      className={`relative flex-1 aspect-square rounded-lg overflow-hidden border-2 transition-all min-w-0 ${
                        viewMode === "360"
                          ? "border-primary shadow-md ring-2 ring-primary/20"
                          : "border-dark-200 hover:border-dark-400"
                      }`}
                    >
                      {/* 背景图：第一张产品图 */}
                      {images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={images[0]}
                          alt="360 view"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      {/* 半透明覆盖层 */}
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <RotateCw size={24} className="text-white" />
                        <span className="text-white text-[10px] font-bold mt-1">360°</span>
                      </div>
                    </button>
                  )}
                  {/* 产品图片缩略图（1-N张） */}
                  {images.map((img: string, index: number) => {
                    const isActive = viewMode === "static" && index === currentImageIndex;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentImageIndex(index);
                          setShowDragHint(false);
                          setViewMode("static");
                        }}
                        className={`relative flex-1 aspect-square rounded-lg overflow-hidden border-2 transition-all min-w-0 ${
                          isActive
                            ? "border-primary shadow-md ring-2 ring-primary/20"
                            : "border-dark-200 hover:border-dark-400"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={toThumbUrl(img)}
                          alt={`${model.model} ${t("view")} ${index + 1}`}
                          className="w-full h-full object-cover bg-dark-50"
                          loading="lazy"
                          onError={(e) => { if (e.currentTarget.src !== img) e.currentTarget.src = img; }}
                        />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/50 text-white text-[9px] px-1 rounded">{index + 1}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick Contact */}
              <div className="mt-6 bg-dark-50 rounded-lg p-6 border border-dark-100">
                <h3 className="font-bold text-dark mb-4">
                  {t("interestedInProduct")}
                </h3>

                {pricing.mode === "public" && !model?.price ? (
                  <>
                    {priceRangeText && (
                      <div className="mb-1 text-lg font-semibold text-primary">{priceRangeText}</div>
                    )}
                    {priceNoteText && (
                      <div className="mb-3 text-xs text-dark-400">{priceNoteText}</div>
                    )}
                  </>
                ) : (
                  <div className="mb-4">
                    <PriceDisplay
                      mode={pricing.mode}
                      isParts={Boolean(model?.isParts)}
                      price={model?.price != null ? Number(model.price) : null}
                      priceTiers={model?.priceTiers}
                      productId={model?.id}
                      productName={model?.model || model?.name}
                      memberCustomerType={pricing.memberCustomerType}
                      memberCanSeeParts={pricing.memberCanSeeParts}
                      locale={locale}
                    />
                  </div>
                )}

                {/* 数量选择 + 加入询价车（shop 模式商品改为直接购买） */}
                {model?.purchaseMode === "shop" && model?.shopSlug ? (
                  <>
                    <button
                      onClick={() => window.location.assign(`/shop/${model.shopSlug}`)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white px-6 py-3 rounded font-medium transition-all mb-2"
                    >
                      <ShoppingCart size={18} />
                      {t("buyNow")}
                    </button>
                    <button
                      onClick={toggleFavorite}
                      disabled={favState === "unknown"}
                      className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-medium transition-all mb-2 border ${
                        favState === "yes"
                          ? "border-primary text-primary bg-primary/5"
                          : "border-dark-200 text-dark-600 hover:border-primary hover:text-primary"
                      }`}
                    >
                      <Heart size={16} className={favState === "yes" ? "fill-current" : ""} />
                      {favState === "yes" ? t("favorited") : t("favorite")}
                    </button>
                    {/* 后台用户专用（owner 2026-10-01，与左文站同步） */}
                    {canSocialPublish && (
                      <Link
                        href={`/admin/social-publish?type=product&id=${encodeURIComponent(String(model.id))}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-medium transition-all mb-2 border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        title="发布到社媒（后台功能）"
                      >
                        <Send size={16} />
                        发布到社媒
                      </Link>
                    )}
                  </>
                ) : (
                <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-dark-600">{t("quantity")}</span>
                  <div className="flex items-center border border-dark-100 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setQuoteQty((q) => Math.max(moqNum, (q || 1) - 1))}
                      className="w-9 h-9 flex items-center justify-center text-dark-600 hover:bg-dark-100"
                    >−</button>
                    <input
                      type="number"
                      min={moqNum}
                      value={quoteQty}
                      onChange={(e) => setQuoteQty(Math.max(moqNum, parseInt(e.target.value, 10) || 1))}
                      className="w-14 h-9 text-center border-x border-dark-100 text-dark-800 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuoteQty((q) => (q || 1) + 1)}
                      className="w-9 h-9 flex items-center justify-center text-dark-600 hover:bg-dark-100"
                    >+</button>
                  </div>
                  <span className="text-xs text-dark-400">MOQ: {moqNum}</span>
                </div>

                <button
                  onClick={addToCart}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-600 text-white px-6 py-3 rounded font-medium transition-all mb-2"
                >
                  <ShoppingCart size={18} />
                  {cartAdded ? t("addedToCart") : t("addToCart")}
                </button>
                <button
                  onClick={toggleFavorite}
                  disabled={favState === "unknown"}
                  className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-medium transition-all mb-2 border ${
                    favState === "yes"
                      ? "border-primary text-primary bg-primary/5"
                      : "border-dark-200 text-dark-600 hover:border-primary hover:text-primary"
                  }`}
                >
                  <Heart size={16} className={favState === "yes" ? "fill-current" : ""} />
                  {favState === "yes" ? t("favorited") : t("favorite")}
                </button>
                {(cartAdded || cartCount > 0) && (
                  <Link
                    href="/quote/cart"
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-6 py-3 rounded font-medium transition-all mb-2"
                  >
                    <ShoppingCart size={16} />
                    {t("goToQuoteCart")}
                    {cartCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}
                </>
                )}

                <div className="space-y-3 mb-4">
                  {phone && (
                    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-3 text-dark-600 hover:text-primary transition-colors">
                      <Phone size={18} className="text-primary" />
                      <bdi dir="ltr">{phone}</bdi>
                    </a>
                  )}
                  {email && (
                    <a href={`mailto:${email}`} className="flex items-center gap-3 text-dark-600 hover:text-primary transition-colors">
                      <Mail size={18} className="text-primary" />
                      <bdi dir="ltr">{email}</bdi>
                    </a>
                  )}
                </div>
                <Link
                  href="/contact"
                  className="w-full inline-flex items-center justify-center gap-2 bg-dark-100 hover:bg-dark-200 text-dark-700 px-6 py-3 rounded font-medium transition-all"
                >
                  {t("requestQuote")}
                  <ArrowRight size={16} className="rtl-flip" />
                </Link>
              </div>
            </div>

            {/* Product Info */}
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded">
                    {loc.get(category, "name")}
                  </span>
                  <span className="bg-dark-100 text-dark-600 text-sm font-medium px-3 py-1 rounded">
                    {loc.get(tab, "name")}
                  </span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-dark mb-2">
                  {loc.get(model, "name")}
                </h2>
                <p className="text-xl text-primary font-semibold">{model.model}</p>
              </div>

              <p className="text-dark-600 leading-relaxed mb-8 text-lg">
                {loc.get(model, "description")}
              </p>

              {/* Product Video */}
              {model.video && (
                <div className="mb-8">
                  <video
                    controls
                    className="w-full rounded-xl border border-dark-100 bg-black max-h-96"
                    preload="metadata"
                    poster={model.coverImage || undefined}
                  >
                    <source src={model.video} />
                    {t("browserVideoNotSupported")}
                  </video>
                </div>
              )}

              {/* Manual Download - All products */}
              <div className="mb-8">
                {manualOk === false ? (
                  <div className="inline-flex items-center gap-3 bg-dark-50 border-2 border-dashed border-dark-200 text-dark-400 px-6 py-3.5 rounded-lg w-full sm:w-auto">
                    <FileText size={20} className="text-primary/50 shrink-0" />
                    <span>{t("noManual")}</span>
                  </div>
                ) : (
                <DownloadGateButton
                  href={manualUrl}
                  resourceName={`${loc.get(model, "name")} (${model.model})`}
                  openInNewTab
                  track={{ type: "manual" }}
                  className="inline-flex items-center gap-3 bg-dark-50 hover:bg-dark-100 border-2 border-dark-200 hover:border-primary text-dark-700 hover:text-primary px-6 py-3.5 rounded-lg font-medium transition-all group w-full sm:w-auto"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="text-start flex-1">
                    <div className="font-bold">{t("downloadProductManual")}</div>
                    <div className="text-xs text-dark-400">{t("pdfFormatSpecs")}</div>
                  </div>
                  <Download size={20} className="ms-2 group-hover:translate-y-0.5 transition-transform" />
                </DownloadGateButton>
                )}
              </div>

              {/* Key Features */}
              <div className="mb-10">
                <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded" />
                  {t("keyFeatures")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {loc.getArray(model, "features").map((feature) => (
                    <div key={feature} className="flex items-start gap-2 bg-dark-50 rounded-lg p-3">
                      <CheckCircle size={18} className="text-primary shrink-0 mt-0.5" />
                      <span className="text-dark-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specifications */}
              <div className="mb-10">
                <h2 className="text-xl font-bold text-dark mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary rounded" />
                  {t("technicalSpecs")}
                </h2>
                <div className="border border-dark-100 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      {groupedSpecs.map((group, gi) =>
                        group.values.map((value, vi) => (
                          <tr key={`${group.key}-${vi}`} className={(gi + vi) % 2 === 0 ? "bg-white" : "bg-dark-50"}>
                            {vi === 0 && (
                              <td rowSpan={group.values.length} className="px-5 py-3 text-dark-500 text-sm w-2/5 border-b border-dark-100">
                                {group.label}
                              </td>
                            )}
                            <td className="px-5 py-3 text-dark-800 text-sm font-medium border-b border-dark-100">
                              {value}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detail Content */}
      {detailContent && (
        <section className="py-12 lg:py-16 bg-dark-50 border-t border-dark-100">
          <div className="container">
            <h2 className="text-2xl font-bold text-dark mb-8 flex items-center gap-2">
              <div className="w-1 h-7 bg-primary rounded" />
              {t("productDetails")}
            </h2>
            <div className="bg-white rounded-lg p-8 lg:p-10 border border-dark-100 shadow-sm">
              <div
                className="prose prose-lg max-w-none text-dark-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: preserveLeadingSpaces(detailContent) }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Related Products */}
      {relatedModels.length > 0 && (
        <section className="py-12 lg:py-16 bg-white">
          <div className="container">
            <h2 className="text-2xl font-bold text-dark mb-8 flex items-center gap-2">
              <div className="w-1 h-7 bg-primary rounded" />
              {t("relatedProducts")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedModels.map((related: any) => (
                <Link
                  key={related.id}
                  href={`/products/${tab.id}/${related.id}`}
                  className="group bg-white border border-dark-100 rounded-lg overflow-hidden hover:border-primary hover:shadow-lg transition-all"
                >
                  {/* 相关产品卡片：同样 1:1 + 铺满（与列表页、主图一致） */}
                  <div className="aspect-square bg-dark-50 relative overflow-hidden">
                    {related.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={toThumbUrl(getImgStr(related.image))} loading="lazy" onError={(e) => { const raw = getImgStr(related.image); if (e.currentTarget.src !== raw) e.currentTarget.src = raw; }} alt={related.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-primary font-bold text-2xl">{related.model.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded">
                      {related.model}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-dark group-hover:text-primary transition-colors text-sm">
                      {loc.get(related, "name")}
                    </h3>
                    <p className="text-dark-500 text-xs mt-1 line-clamp-2">
                      {loc.get(related, "description")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 猜你喜欢（ai-recommend 插件） */}
      <RecommendBox targetType="product" targetId={modelId} locale={locale} />

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("needCustomSolution")}
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            {t("customSolutionDesc")}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-white text-primary hover:bg-dark-50 px-8 py-3.5 rounded font-medium transition-all"
          >
            {t("contactUs")}
            <ArrowRight size={18} className="rtl-flip" />
          </Link>
        </div>
      </section>
    </div>
  );
}
