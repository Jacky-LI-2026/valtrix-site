/**
 * 地理位置原子（Geo Atom）
 * =====================================================
 * 统一地理位置能力：IP → 国家/城市，客户端 IP 提取。
 * 封装 lib/geo.ts，页面/API 统一调用。
 */
export {
  getGeoInfo,
  getClientIp,
  getLocationFields,
} from "@/lib/geo";
import { getGeoInfo, getClientIp, getLocationFields } from "@/lib/geo";
import type { GeoInfo } from "@/lib/geo";

/** 从请求头提取客户端 IP 并解析地域（一行完成，供各提交类 API 复用） */
export function ipToLocation(headers: Headers | Record<string, string | string[] | null | undefined>): { ip: string | null; country: string | null; city: string | null; geo: GeoInfo | null } {
  const ip = getClientIp(headers);
  const fields = getLocationFields(ip);
  const geo = ip ? getGeoInfo(ip) : null;
  return { ip: fields.ip, country: fields.country, city: fields.city, geo };
}
