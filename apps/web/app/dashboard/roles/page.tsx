"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Lock, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Separator,
  Skeleton,
} from "@lc/ui";
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission,
  type RoleDto,
} from "@lc/schema";
import { createRole, deleteRole, listRoles, updateRole } from "@/lib/api";
import { useAuth, useRequireAuth } from "@/components/auth/auth-provider";
import { UserMenu } from "@/components/auth/user-menu";

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 权限勾选区:按组渲染;admin 锁定为全量 */
function PermissionChecklist({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (perm: Permission) => {
    onChange(
      value.includes(perm) ? value.filter((p) => p !== perm) : [...value, perm],
    );
  };

  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map((group) => {
        const perms = (Object.keys(PERMISSION_LABELS) as Permission[]).filter((p) =>
          p.startsWith(group.prefix),
        );
        if (perms.length === 0) return null;
        return (
          <div key={group.prefix}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{group.label}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {perms.map((perm) => (
                <label
                  key={perm}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                    disabled ? "opacity-70" : "cursor-pointer hover:bg-muted/60"
                  }`}
                >
                  <Checkbox
                    checked={value.includes(perm)}
                    disabled={disabled}
                    onCheckedChange={() => toggle(perm)}
                  />
                  <span className="truncate" title={perm}>
                    {PERMISSION_LABELS[perm]}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RolesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const { can } = useAuth();
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);

  // 新建
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "" });
  const [formPerms, setFormPerms] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // 编辑
  const [editTarget, setEditTarget] = useState<RoleDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);

  useEffect(() => {
    if (!authLoading && user && !can("role:read")) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, can, router]);

  const refresh = useCallback(async () => {
    try {
      setRoles(await listRoles());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载角色列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && can("role:read")) void refresh();
  }, [user, can, refresh]);

  async function handleCreate() {
    if (!form.key.trim() || !form.name.trim()) return;
    setCreating(true);
    try {
      await createRole({
        key: form.key.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        permissions: formPerms,
      });
      toast.success("角色已创建");
      setCreateOpen(false);
      setForm({ key: "", name: "", description: "" });
      setFormPerms([]);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(r: RoleDto) {
    setEditTarget(r);
    setEditName(r.name);
    setEditDescription(r.description);
    setEditPerms([...r.permissions]);
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateRole(editTarget.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        permissions: editTarget.key === "admin" ? undefined : editPerms,
      });
      toast.success("已保存,相关用户权限即时生效");
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
      await deleteRole(deleteTarget.id);
      toast.success(`已删除角色「${deleteTarget.name}」`);
      setDeleteTarget(null);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  }

  const skeleton = (
    <div className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <Skeleton className="h-11 w-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  if (authLoading || (user && !can("role:read"))) return skeleton;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-500/10 via-indigo-500/[0.04] to-transparent" />

      <div className="relative mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild size="icon" variant="ghost" title="返回页面列表">
              <a href="/dashboard">
                <ArrowLeft />
              </a>
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">角色权限</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                自定义角色并勾选权限点,变更即时生效
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {can("role:create") ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                新建角色
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
                  <th className="px-5 py-3 text-left font-medium">角色</th>
                  <th className="px-5 py-3 text-left font-medium">权限</th>
                  <th className="px-5 py-3 text-left font-medium">用户数</th>
                  <th className="px-5 py-3 text-left font-medium">创建时间</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/8">
                {roles.map((r) => {
                  const locked = r.key === "admin";
                  return (
                    <tr key={r.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white">
                            {r.key === "admin" ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <KeyRound className="h-4 w-4" />
                            )}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5 font-medium">
                              {r.name}
                              {r.isSystem ? <Badge variant="secondary">内置</Badge> : null}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {r.description || r.key}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {locked ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Lock className="h-3.5 w-3.5" />
                            全部权限
                          </span>
                        ) : (
                          <span>{r.permissions.length} 项</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {r.userCount}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                        {formatTime(r.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {can("role:update") ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={locked}
                            title={locked ? "内置管理员权限锁定为全量" : undefined}
                            onClick={() => openEdit(r)}
                          >
                            {locked ? "已锁定" : "编辑"}
                          </Button>
                        ) : null}
                        {can("role:delete") && !r.isSystem ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            title="删除角色"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          内置角色不可删除;「管理员」权限锁定为全量。「编辑」「访客」与自定义角色均可调整权限点;
          角色权限变更即时生效,正在编辑的用户保存页面时会按新权限校验。
        </p>
      </div>

      {/* 新建角色 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建角色</DialogTitle>
            <DialogDescription>定义角色标识与权限点集合</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-key">角色标识</Label>
                <Input
                  id="r-key"
                  value={form.key}
                  placeholder="如 reviewer"
                  onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase() })}
                />
                <p className="text-xs text-muted-foreground">小写字母开头,仅小写字母/数字/中划线</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-name">角色名称</Label>
                <Input
                  id="r-name"
                  value={form.name}
                  placeholder="如 审核员"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-desc">描述</Label>
              <Input
                id="r-desc"
                value={form.description}
                placeholder="可选"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Separator />
            <PermissionChecklist value={formPerms} onChange={setFormPerms} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={creating || !form.key.trim() || !form.name.trim()}
            >
              {creating ? "创建中…" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑角色 */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑角色 — {editTarget?.name}</DialogTitle>
            <DialogDescription>
              {editTarget?.key === "admin"
                ? "内置管理员权限锁定为全量,不可修改"
                : "调整权限点后,该角色用户的权限即时生效"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="e-rname">角色名称</Label>
                <Input
                  id="e-rname"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>角色标识</Label>
                <Input value={editTarget?.key ?? ""} disabled />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-rdesc">描述</Label>
              <Input
                id="e-rdesc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <Separator />
            <PermissionChecklist
              value={editTarget?.key === "admin" ? [...(DEFAULT_ROLE_PERMISSIONS.admin ?? [])] : editPerms}
              onChange={setEditPerms}
              disabled={editTarget?.key === "admin"}
            />
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
            <DialogTitle>删除角色</DialogTitle>
            <DialogDescription>
              确定删除角色「{deleteTarget?.name}」？仍在使用该角色的用户会阻止删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              <Trash2 />
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
