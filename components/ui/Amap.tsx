"use client"

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface AmapProps {
  apiKey: string;
  securityJsCode?: string;
  latitude: number | string;
  longitude: number | string;
  zoom?: number;
  markerTitle?: string;
  height?: string;
  className?: string;
}

declare global {
  interface Window {
    AMap: any;
    _amapLoading: Promise<void> | null;
  }
}

export default function Amap({
  apiKey,
  securityJsCode,
  latitude,
  longitude,
  zoom = 15,
  markerTitle = "位置",
  height = "400px",
  className = "",
}: AmapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 高德常见错误码 → 中文排查指引（用户自助排查）
  const amapErrorHint = (raw: string): string => {
    const s = String(raw || "");
    const t = s.toUpperCase();
    if (t.includes("INVALID_USER_SCODE")) {
      return "高德安全密钥无效或缺失。请在控制台「应用 → 设置 → Key 详情 → JS API 安全密钥」获取，并填入后台「高德地图安全密钥」；注意不要使用 Web 服务的安全密钥（两者不同）。";
    }
    if (t.includes("INVALID_USER_KEY") || t.includes("USERKEY_PLAT_NOMATCH") || t.includes("ILLEGAL_USER_KEY")) {
      return "API Key 无效或类型不匹配。请确认使用的是「Web端(JS API)」类型的 Key（在控制台创建 Key 时服务类型选「Web端(JS API)」），且已在该 Key 的域名白名单中加入本站域名（含 IP）。";
    }
    if (t.includes("INVALID_PARAMS") || t.includes("DAILY_QUERY_OVER_LIMIT")) {
      return "高德地图请求被拒绝：请检查 Key 配额/每日调用限制，或参数配置。";
    }
    return raw || "地图加载失败";
  };

  // 动态加载高德地图JS API
  const loadAmap = (key: string): Promise<void> => {
    if (window.AMap) {
      return Promise.resolve();
    }
    if (window._amapLoading) {
      return window._amapLoading;
    }

    // 高德 JS API 2.0 要求：加载脚本前必须设置安全密钥（securityJsCode），否则报 INVALID_USER_SCODE
    if (securityJsCode) {
      (window as any)._AMapSecurityConfig = { securityJsCode };
    }
    window._amapLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.async = true;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Marker`;
      script.onload = () => {
        if (window.AMap) {
          resolve();
        } else {
          reject(new Error("高德地图加载失败"));
        }
      };
      script.onerror = () => {
        reject(new Error("高德地图脚本加载失败，请检查网络连接或API Key"));
      };
      document.head.appendChild(script);
    });

    return window._amapLoading;
  };

  useEffect(() => {
    let map: any = null;
    let marker: any = null;

    const initMap = async () => {
      if (!apiKey) {
        setError("未配置高德地图API Key");
        setLoading(false);
        return;
      }
      if (!securityJsCode) {
        setError("未配置高德地图安全密钥");
        setLoading(false);
        return;
      }

      try {
        await loadAmap(apiKey);

        if (!mapContainerRef.current) return;

        const lat = parseFloat(String(latitude));
        const lng = parseFloat(String(longitude));

        if (isNaN(lat) || isNaN(lng)) {
          setError("经纬度格式不正确");
          setLoading(false);
          return;
        }

        // 创建地图
        map = new window.AMap.Map(mapContainerRef.current, {
          zoom: zoom,
          center: [lng, lat],
          viewMode: "2D",
          mapStyle: "amap://styles/normal",
        });

        // 添加标记点
        marker = new window.AMap.Marker({
          position: [lng, lat],
          title: markerTitle,
          anchor: "bottom-center",
        });
        map.add(marker);

        // 添加信息窗口
        const infoWindow = new window.AMap.InfoWindow({
          content: `<div style="padding: 8px 12px; font-size: 14px;">${markerTitle}</div>`,
          offset: new window.AMap.Pixel(0, -30),
        });

        marker.on("click", () => {
          infoWindow.open(map, marker.getPosition());
        });

        setLoading(false);
      } catch (err: any) {
        console.error("高德地图初始化失败:", err);
        setError(amapErrorHint(err?.message || String(err)));
        setLoading(false);
      }
    };

    initMap();

    return () => {
      if (map) {
        map.destroy();
        map = null;
      }
    };
  }, [apiKey, latitude, longitude, zoom, markerTitle]);

  if (error || !apiKey) {
    return (
      <div
        className={`rounded-lg bg-gray-100 flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center text-gray-400">
          <MapPin size={40} className="mx-auto mb-2" />
          <p className="text-sm">{error || "地图位置"}</p>
          {!apiKey && <p className="text-xs mt-1">请在后台站点配置中设置高德地图API Key</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">地图加载中...</p>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
