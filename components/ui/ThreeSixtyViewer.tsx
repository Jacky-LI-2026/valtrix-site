"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { RotateCw, ZoomIn, ZoomOut, Play, Pause, Hand } from "lucide-react";

interface ThreeSixtyViewerProps {
  imagePathTemplate: string; // 例如 "/images/360/zw-10d/Frame{index}.png"
  totalFrames: number; // 总帧数，例如60
  startIndex?: number; // 起始帧索引，从1开始
  className?: string;
  autoRotate?: boolean; // 是否自动旋转
  autoRotateSpeed?: number; // 自动旋转速度（毫秒/帧）
}

export default function ThreeSixtyViewer({
  imagePathTemplate,
  totalFrames,
  startIndex = 1,
  className = "",
  autoRotate = false,
  autoRotateSpeed = 80,
}: ThreeSixtyViewerProps) {
  const { t } = useI18n();
  const [currentFrame, setCurrentFrame] = useState(startIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate);
  const [loadedFrames, setLoadedFrames] = useState<Set<number>>(new Set([startIndex]));
  const [showHint, setShowHint] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartFrame = useRef(startIndex);
  const autoRotateTimer = useRef<NodeJS.Timeout | null>(null);
  const imageCache = useRef<Map<number, HTMLImageElement>>(new Map());

  // 生成图片路径
  const getImagePath = useCallback((frame: number) => {
    // 确保帧索引在有效范围内（循环）
    let normalizedFrame = ((frame - 1) % totalFrames + totalFrames) % totalFrames + 1;
    return imagePathTemplate.replace("{index}", String(normalizedFrame).padStart(6, "0"));
  }, [imagePathTemplate, totalFrames]);

  // 预加载图片
  const preloadImage = useCallback((frame: number) => {
    if (imageCache.current.has(frame)) return;
    const img = new Image();
    img.src = getImagePath(frame);
    img.onload = () => {
      setLoadedFrames((prev) => new Set(prev).add(frame));
    };
    imageCache.current.set(frame, img);
  }, [getImagePath]);

  // 预加载附近的帧
  const preloadNearbyFrames = useCallback((centerFrame: number, range: number = 5) => {
    for (let i = -range; i <= range; i++) {
      preloadImage(centerFrame + i);
    }
  }, [preloadImage]);

  // 初始预加载
  useEffect(() => {
    preloadNearbyFrames(startIndex, 8);
  }, [startIndex, preloadNearbyFrames]);

  // 自动旋转
  useEffect(() => {
    if (isAutoRotating && !isDragging) {
      autoRotateTimer.current = setInterval(() => {
        setCurrentFrame((prev) => {
          const next = prev + 1;
          preloadNearbyFrames(next, 3);
          return next > totalFrames ? 1 : next;
        });
      }, autoRotateSpeed);
    }
    return () => {
      if (autoRotateTimer.current) {
        clearInterval(autoRotateTimer.current);
      }
    };
  }, [isAutoRotating, isDragging, totalFrames, autoRotateSpeed, preloadNearbyFrames]);

  // 拖拽开始
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setIsAutoRotating(false);
    setShowHint(false);
    dragStartX.current = clientX;
    dragStartFrame.current = currentFrame;
  }, [currentFrame]);

  // 拖拽移动
  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStartX.current;
    // 每4像素切换一帧，旋转一圈需要约240像素（60帧*4px）
    const frameDelta = Math.round(deltaX / 4);
    let newFrame = dragStartFrame.current + frameDelta;
    // 循环帧
    newFrame = ((newFrame - 1) % totalFrames + totalFrames) % totalFrames + 1;
    setCurrentFrame(newFrame);
    preloadNearbyFrames(newFrame, 3);
  }, [isDragging, totalFrames, preloadNearbyFrames]);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
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

  // 全局鼠标up事件
  useEffect(() => {
    if (isDragging) {
      const globalMouseUp = () => handleDragEnd();
      window.addEventListener("mouseup", globalMouseUp);
      return () => window.removeEventListener("mouseup", globalMouseUp);
    }
  }, [isDragging, handleDragEnd]);

  const currentImageSrc = getImagePath(currentFrame);
  const isCurrentLoaded = loadedFrames.has(currentFrame);

  return (
    <div
      ref={containerRef}
      className={`relative bg-dark-50 rounded-lg overflow-hidden select-none ${className}`}
      style={{ touchAction: "none" }}
    >
      {/* 主图片 */}
      <div
        className={`w-full aspect-[5/4] flex items-center justify-center cursor-grab ${
          isDragging ? "cursor-grabbing" : ""
        } ${isZoomed ? "overflow-auto" : "overflow-hidden"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 加载中占位 */}
        {!isCurrentLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-50">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-dark-400 text-sm">{t("loading")}</p>
            </div>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImageSrc}
          alt={`360° view - frame ${currentFrame}`}
          className={`max-w-full max-h-full object-contain transition-opacity duration-100 ${
            isCurrentLoaded ? "opacity-100" : "opacity-0"
          } ${isZoomed ? "max-w-none scale-150" : ""}`}
          draggable={false}
          style={{ pointerEvents: "none" }}
        />
      </div>

      {/* 首次使用提示 */}
      {showHint && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] pointer-events-none">
          <div className="bg-white/95 rounded-2xl px-6 py-4 shadow-xl text-center animate-pulse">
            <Hand size={32} className="text-primary mx-auto mb-2" />
            <p className="text-dark-800 font-bold text-sm">{t("dragToRotate360")}</p>
            <p className="text-dark-500 text-xs mt-1">Drag to rotate 360°</p>
          </div>
        </div>
      )}

      {/* 顶部工具栏 */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
          <RotateCw size={14} className={isDragging ? "animate-spin" : ""} />
          <span>{t("rotate360")}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            title={isAutoRotating ? t("pauseAutoRotate") : t("autoRotate")}
          >
            {isAutoRotating ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            title={isZoomed ? t("zoomOut") : t("galleryZoom")}
          >
            {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
          </button>
        </div>
      </div>

      {/* 底部进度条 */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="h-1 bg-black/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${(currentFrame / totalFrames) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
