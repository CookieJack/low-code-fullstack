"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasPermission, type Permission, type UserDto } from "@lc/schema";
import { getMe } from "@/lib/api";
import { clearAuth, getAccessToken, getStoredUser, logout as logoutRequest } from "@/lib/auth-client";

type AuthContextValue = {
  /** 当前登录用户;null 表示未登录(初始化期间配合 loading 判断) */
  user: UserDto | null;
  /** 初始化期间(读本地存储 / 拉 /me)为 true */
  loading: boolean;
  can: (perm: Permission) => boolean;
  login: (user: UserDto) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  can: () => false,
  login: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    setUser(getStoredUser());
    // 用 /me 校验 token 并刷新角色(本地缓存的角色可能已被管理员修改)
    getMe()
      .then(setUser)
      .catch(() => {
        // 401 已由 api.ts 统一清理跳转;此处仅兜底
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((u: UserDto) => setUser(u), []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      // 权限点由服务端随登录/me 下发(动态角色);旧缓存对象无 permissions 时回退到内置映射
      can: (perm) =>
        user?.enabled
          ? (user.permissions?.includes(perm) ?? hasPermission(user.role, perm))
          : false,
      login,
      logout,
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** 页面守卫:未登录跳登录页(带回跳地址),返回 loading/user 供页面渲染骨架 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 依赖 user:初始化完成或登出后 user 变为 null 都会触发跳转
    if (loading || user) return;
    clearAuth();
    router.replace(`/login?redirect=${encodeURIComponent(pathname ?? "/")}`);
  }, [loading, user, router, pathname]);

  return { user, loading: loading || !user };
}
