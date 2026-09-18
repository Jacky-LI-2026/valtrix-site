/**
 * 验证码原子（Captcha Atom）
 * =====================================================
 * 统一人机验证：创建 / 校验 / 消费。
 * 封装 lib/captcha.ts（内存 store），页面/API 统一调用。
 */
export {
  createCaptcha,
  getCaptchaAnswer,
  consumeCaptcha,
} from "@/lib/captcha";
import { createCaptcha, consumeCaptcha, getCaptchaAnswer } from "@/lib/captcha";

/** 校验验证码（不消费，可重复查询） */
export function verifyCaptcha(captchaId: string, answer: string): boolean {
  if (!captchaId || !answer) return false;
  const real = getCaptchaAnswer(captchaId);
  if (real === null) return false;
  return String(answer).trim().toLowerCase() === real.toLowerCase();
}

/** 校验并消费（一次性，校验通过即失效） */
export function verifyAndConsumeCaptcha(captchaId: string, answer: string): boolean {
  if (!captchaId || !answer) return false;
  const real = consumeCaptcha(captchaId);
  if (real === null) return false;
  return String(answer).trim().toLowerCase() === real.toLowerCase();
}

/** 生成验证码（供 /api/contact/captcha 等复用） */
export function newCaptcha() {
  return createCaptcha();
}
