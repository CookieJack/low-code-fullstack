"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
} from "@lc/ui";
import { ROLE_LABELS, type RoleDto, type UserDto } from "@lc/schema";
import { createUser, deleteUser, listRoles, listUsers, updateUser } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/components/auth/auth-provider";
import { UserMenu } from "@/components/auth/user-menu";

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const roleLabel = (key: string, roleName?: string | null) =>
  roleName || ROLE_LABELS[key] || key;

function RoleBadge({ role, roleName }: { role: string; roleName?: string | null }) {
  const variant = role === "admin" ? "success" : role === "viewer" ? "secondary" : "default";
  return (
    <Badge variant={variant}>
      {role === "admin" ? <ShieldCheck className="h-3 w-3" /> : null}
      {roleLabel(role, roleName)}
    </Badge>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const { can } = useAuth();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);

  // 新建
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", name: "" });
  const [formRole, setFormRole] = useState("viewer");
  const [creating, setCreating] = useState(false);

  // 编辑
  const [editTarget, setEditTarget] = useState<UserDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("viewer");
  const [editEnabled, setEditEnabled] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);

  // 无 user:read 权限,送回首页
  useEffect(() => {
    if (!authLoading && user && !can("user:read")) {
      router.replace("/");
    }
  }, [authLoading, user, can, router]);

  const refresh = useCallback(async () => {
    try {
      const [users, roles] = await Promise.all([listUsers(), listRoles()]);
      setUsers(users);
      setRoles(roles);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载用户列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && can("user:read")) void refresh();
  }, [user, can, refresh]);

  async function handleCreate() {
    if (!form.username.trim() || form.password.length < 6) return;
    setCreating(true);
    try {
      await createUser({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        role: formRole,
      });
      toast.success("用户已创建");
      setCreateOpen(false);
      setForm({ username: "", password: "", name: "" });
      setFormRole("viewer");
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u: UserDto) {
    setEditTarget(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditEnabled(u.enabled);
    setEditPassword("");
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateUser(editTarget.id, {
        name: editName.trim(),
        role: editRole,
        enabled: editEnabled,
        ...(editPassword ? { password: editPassword } : {}),
      });
      toast.success("已保存");
      setEditTarget(null);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      toast.success(`已删除用户「${deleteTarget.username}」`);
      setDeleteTarget(null);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  }

  if (authLoading || (user && !can("user:read"))) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-10">
        <Skeleton className="h-11 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-500/10 via-indigo-500/[0.04] to-transparent" />

      <div className="relative mx-auto max-w-4xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" variant="ghost" title="返回页面列表">
              <a href="/">
                <ArrowLeft />
              </a>
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">用户管理</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">账号、角色与启用状态</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {can("user:create") ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                新建用户
              </Button>
            ) : null}
            <UserMenu />
          </div>
        </header>

        <div className="mt-8 overflow-hidden rounded-xl bg-card shadow-card">
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">用户</th>
                  <th className="px-5 py-3 text-left font-medium">角色</th>
                  <th className="px-5 py-3 text-left font-medium">状态</th>
                  <th className="px-5 py-3 text-left font-medium">创建时间</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/8">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                          {(u.name || u.username).slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-medium">{u.name || u.username}</div>
                          <div className="text-xs text-muted-foreground">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <RoleBadge role={u.role} roleName={u.roleName} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={u.enabled ? "success" : "destructive"}>
                        {u.enabled ? "启用" : "禁用"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                      {formatTime(u.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {can("user:update") ? (
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                          编辑
                        </Button>
                      ) : null}
                      {can("user:delete") && u.id !== user?.id ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          title="删除用户"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 新建用户 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新建用户</DialogTitle>
            <DialogDescription>创建账号并分配角色</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="u-username">用户名</Label>
              <Input
                id="u-username"
                value={form.username}
                placeholder="仅字母、数字、下划线和中划线"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-name">显示名称</Label>
              <Input
                id="u-name"
                value={form.name}
                placeholder="可选"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-password">初始密码</Label>
              <Input
                id="u-password"
                type="password"
                value={form.password}
                placeholder="至少 6 位"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>角色</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {roles.find((r) => r.key === formRole)?.description ||
                  "角色权限可在「角色权限」页中配置"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={creating || !form.username.trim() || form.password.length < 6}
            >
              {creating ? "创建中…" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户 */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑用户 — {editTarget?.username}</DialogTitle>
            <DialogDescription>修改显示名称、角色、启用状态或重置密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-name">显示名称</Label>
              <Input id="e-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>角色</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
              <Label htmlFor="e-enabled">启用账号</Label>
              <Switch id="e-enabled" checked={editEnabled} onCheckedChange={setEditEnabled} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-password">重置密码</Label>
              <Input
                id="e-password"
                type="password"
                value={editPassword}
                placeholder="留空则不修改"
                onChange={(e) => setEditPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>删除用户</DialogTitle>
            <DialogDescription>
              确定删除「{deleteTarget?.username}」？该用户的所有登录态将立即失效。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              <UserRound />
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
