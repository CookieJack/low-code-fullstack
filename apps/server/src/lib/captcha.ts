import { randomUUID } from "node:crypto";
import { create } from "svg-captcha";
import { redis, ensureRedis } from "./redis";

/** 验证码有效期(秒);一次性使用,校验即删 */
const CAPTCHA_TTL_SEC = 300;
const CAPTCHA_KEY_PREFIX = "lc:captcha:";

export type CaptchaIssue = { captchaId: string; svg: string };

/** 生成图形验证码;Redis 写失败照常返回,由校验端降级放行兜底 */
export async function createCaptcha(): Promise<CaptchaIssue> {
  const { data, text } = create({
    size: 4,
    // 过滤易混淆字符,配合忽略大小写比较
    ignoreChars: "0oO1ilI",
    width: 120,
    height: 40,
    noise: 3,
    color: true,
    background: "#f5f5f7",
  });
  const captchaId = randomUUID();
  if (await ensureRedis()) {
    try {
      await redis.set(CAPTCHA_KEY_PREFIX + captchaId, text, "EX", CAPTCHA_TTL_SEC);
    } catch {
      /* 该验证码将无法通过校验,用户刷新重试即可 */
    }
  }
  return { captchaId, svg: data };
}

/** 校验验证码(GETDEL 保证一次性);Redis 不可用时放行,与限流的降级策略一致 */
export async function verifyCaptcha(captchaId: string, code: string): Promise<boolean> {
  if (!captchaId || !code) return false;
  if (!(await ensureRedis())) return true;
  try {
    const text = await redis.getdel(CAPTCHA_KEY_PREFIX + captchaId);
    if (!text) return false;
    return text.toLowerCase() === code.trim().toLowerCase();
  } catch {
    return true;
  }
}
