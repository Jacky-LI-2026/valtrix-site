"use client"

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import FreeMap from "@/components/ui/FreeMap";

interface MapEntry {
  key: number;
  label: string;
  lat: number;
  lng: number;
  zoom: number;
  markerTitle: string;
}

export default function ContactMap() {
  const { t, locale } = useI18n();
  const [maps, setMaps] = useState<MapEntry[]>([]);
  const [amapKey, setAmapKey] = useState("");
  const [amapSecurityCode, setAmapSecurityCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/site-config?key=contact_info")
      .then((r) => r.json())
      .then((data) => {
        const info = data.data || {};
        const key = (info.amapKey as string) || "";
        setAmapKey(key);
        setAmapSecurityCode((info.amapSecurityCode as string) || "");

        const addrField =
          locale === "zh" ? "addresses" : `addresses${locale.charAt(0).toUpperCase()}${locale.slice(1)}`;
        const addrs = Array.isArray(info[addrField]) ? info[addrField] : Array.isArray(info.addresses) ? info.addresses : [];
        const rawMaps = Array.isArray(info.addressMaps) ? info.addressMaps : [];
        const siteName = info.siteName || "";

        const entries: MapEntry[] = [];
        rawMaps.forEach((m: any, i: number) => {
          if (m && m.enabled && m.lat && m.lng) {
            const lat = parseFloat(String(m.lat));
            const lng = parseFloat(String(m.lng));
            if (!isNaN(lat) && !isNaN(lng)) {
              const nm = m.name;
              let nameLabel = "";
              if (typeof nm === "string") nameLabel = nm;
              else if (nm && typeof nm === "object") nameLabel = String(nm[locale] || nm.zh || "");
              entries.push({
                key: i,
                label: nameLabel || String(addrs[i] || t("address") + " " + (i + 1)),
                lat,
                lng,
                zoom: parseInt(String(m.zoom)) || 15,
                markerTitle: nameLabel || siteName || String(addrs[i] || "位置"),
              });
            }
          }
        });

        // 旧版单地址地图：未使用「按地址生成地图」时，若配置了经纬度则兜底显示
        if (entries.length === 0 && info.amapLatitude && info.amapLongitude) {
          const lat = parseFloat(String(info.amapLatitude));
          const lng = parseFloat(String(info.amapLongitude));
          if (!isNaN(lat) && !isNaN(lng)) {
            entries.push({
              key: -1,
              label: String(addrs[0] || ""),
              lat,
              lng,
              zoom: parseInt(String(info.amapZoom)) || 15,
              markerTitle: info.amapMarkerTitle || siteName || "位置",
            });
          }
        }

        setMaps(entries);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [locale, t]);

  if (loading) {
    return (
      <div className="aspect-[16/9] rounded-lg bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">{t("loading")}</div>
      </div>
    );
  }

  if (maps.length === 0) {
    return (
      <div className="aspect-[16/9] rounded-lg bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-sm">{t("mapNotConfigured")}</p>
          <p className="text-xs mt-1">{t("mapNotConfiguredHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {maps.map((m) => (
        <div key={m.key} className="space-y-2">
          <FreeMap
            apiKey={amapKey}
            securityJsCode={amapSecurityCode}
            latitude={m.lat}
            longitude={m.lng}
            zoom={m.zoom}
            markerTitle={m.markerTitle}
            height="340px"
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
}
