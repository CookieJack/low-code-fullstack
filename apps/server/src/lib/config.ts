/** 认证相关配置;JWT_SECRET 生产环境必须显式配置 */

const DEV_SECRET = "lc-dev-secret-change-me";

export const JWT_SECRET =
  process.env.JWT_SECRET ?? DEV_SECRET;

if (!process.env.JWT_SECRET) {
  console.warn(
    "[config] 未设置 JWT_SECRET,正在使用开发默认值——生产环境必须显式配置",
  );
}

/** access token 有效期(Hono/jwt exp 相对秒数) */
export const ACCESS_TOKEN_TTL_SEC = Number(process.env.ACCESS_TOKEN_TTL_SEC ?? 2 * 60 * 60);
/** refresh token 有效期(天) */
export const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
