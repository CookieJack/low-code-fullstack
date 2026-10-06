"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@lc/ui";
import { login, getAccessToken } from "@/lib/auth-client";
import { useAuth } from "@/components/auth/auth-provider";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login: setUser, user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirect = params?.get("redirect") || "/";

  // 已登录直接离开登录页
  useEffect(() => {
    if (!loading && user && getAccessToken()) {
      router.replace(redirect);
    }
  }, [loading, user, router, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError("");
    try {
      const tokens = await login(username.trim(), password);
      setUser(tokens.user);
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      {/* 品牌氛围光 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-sm shadow-card">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient shadow-brand">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight">低代码建站平台</h1>
            <p className="mt-1 text-sm text-muted-foreground">登录后开始搭建你的官网</p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting || !username.trim() || !password}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  登录中…
                </>
              ) : (
                "登 录"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
