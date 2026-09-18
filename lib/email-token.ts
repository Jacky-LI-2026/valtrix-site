// 邮件订阅 token 编解码（base64url(email)），供退订链接使用
export function encodeEmailToken(email: string): string {
  return Buffer.from(email).toString("base64url");
}
export function decodeEmailToken(token: string): string | null {
  try {
    const email = Buffer.from(token, "base64url").toString("utf8");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return email;
  } catch {
    return null;
  }
}
