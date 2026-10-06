"use client";

import { LogOut, Users } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lc/ui";
import { ROLE_LABELS } from "@lc/schema";
import { useAuth } from "@/components/auth/auth-provider";

/** 右上角当前用户菜单:账号信息、用户管理入口(仅 admin)、退出登录 */
export function UserMenu() {
  const { user, can, logout } = useAuth();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" aria-label="账号菜单">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
            {(user.name || user.username).slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden sm:inline">{user.name || user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <div className="px-2 py-1.5">
          <div className="text-sm font-medium">{user.name || user.username}</div>
          <div className="text-xs text-muted-foreground">@{user.username}</div>
          <Badge variant="secondary" className="mt-1.5">
            {ROLE_LABELS[user.role]}
          </Badge>
        </div>
        <DropdownMenuSeparator />
        {can("user:read") ? (
          <DropdownMenuItem asChild>
            <a href="/users">
              <Users />
              用户管理
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => void logout()}
        >
          <LogOut />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
