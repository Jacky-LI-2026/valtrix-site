"use client"

import { useMemo } from "react";
import Amap from "@/components/ui/Amap";
import { MapPin } from "lucide-react";

interface FreeMapProps {
  /** 高德 API Key（Web端(JS API) 类型），为空时使用高德 URI 免Key内嵌定位图（国内可达、无需Key） */
  apiKey: string;
  /** 高德 JS API 安全密钥（securityJsCode），使用高德时必须配置 */
  securityJsCode?: string;
  latitude: number | string;
  longitude: number | string;
  zoom?: number;
  markerTitle?: string;
  height?: string;
  className?: string;
}

/**
 * 免费地图三级降级：
 * 1. 配置高德 JS Key → 高德 JS API 完整交互地图（国内最流畅、可缩放拖动）
 * 2. 未配置 Key → 高德 URI 免Key 内嵌定位图（ditu.amap.com，国内可达、带中文标注、可点击跳转高德APP）
 * 3. 经纬度缺失 → 提示后台配置
 */
export default function FreeMap({
  apiKey,
  securityJsCode,
  latitude,
  longitude,
  zoom = 15,
  markerTitle = "位置",
  height = "360px",
  className = "",
}: FreeMapProps) {
  const lat = parseFloat(String(latitude));
  const lng = parseFloat(String(longitude));

  // 高德 URI 免Key 定位图 URL（marker 居中；src=uriapi 标识来源）
  const amapUriSrc = useMemo(() => {
    if (isNaN(lat) || isNaN(lng)) return "";
    const name = encodeURIComponent(markerTitle || "位置");
    return `https://uri.amap.com/marker?position=${lng},${lat}&name=${name}&src=uriapi&coordinate=gaode`;
  }, [lat, lng, markerTitle]);

  if (isNaN(lat) || isNaN(lng)) {
    return (
      <div
        className={`rounded-lg bg-gray-100 flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center text-gray-400">
          <MapPin size={36} className="mx-auto mb-2" />
          <p className="text-sm">该地址未配置经纬度</p>
          <p className="text-xs mt-1">请在后台「站点配置 → 联系方式」为该地址启用在线地图并填写/定位经纬度</p>
        </div>
      </div>
    );
  }

  if (apiKey) {
    return (
      <Amap
        apiKey={apiKey}
        securityJsCode={securityJsCode}
        latitude={lat}
        longitude={lng}
        zoom={zoom}
        markerTitle={markerTitle}
        height={height}
        className={className}
      />
    );
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-gray-100 ${className}`}
      style={{ height }}
    >
      <iframe
        title={markerTitle || "Map"}
        src={amapUriSrc}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="absolute bottom-1 right-1 bg-white/85 text-gray-500 text-[11px] px-1.5 py-0.5 rounded">
        高德定位图 · 后台配置 Key 后可交互
      </div>
    </div>
  );
}
