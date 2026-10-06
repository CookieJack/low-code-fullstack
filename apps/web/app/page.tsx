"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  FileText,
  Globe,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Plus,
  Rocket,
  Table2,
  Trash2,
  UsersRound,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Switch,
} from "@lc/ui";
import type { PageMember, PageMeta, PageMemberLevel, UserDto } from "@lc/schema";
import {
  createPage,
  deletePage,
  duplicatePage,
  getSubmissions,
  listPageMembers,
  listPages,
  listUsers,
  removePageMember,
  unpublishPage,
  updatePageVisibility,
  upsertPageMember,
} from "@/lib/api";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth, useRequireAuth } from "@/components/auth/auth-provider";
import { UserMenu } from "@/components/auth/user-menu";

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* 按页面名稳定挑选一套封面渐变,让卡片各有色彩但不随机跳变 */
const COVER_GRADIENTS = [
  "from-indigo-500 via-indigo-400 to-violet-500",
  "from-sky-500 via-sky-400 to-indigo-500",
  "from-fuchsia-500 via-pink-400 to-rose-500",
  "from-emerald-500 via-teal-400 to-cyan-500",
  "from-amber-500 via-orange-400 to-rose-400",
  "from-violet-500 via-purple-400 to-fuchsia-500",
];

function coverGradientOf(name: string): string {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
}

/* 卡片顶部的装饰性"页面预览":渐变底 + 迷你浏览器窗口 mock */
function PageCover({ name }: { name: string }) {
  return (
    <div className={`relative h-28 overflow-hidden bg-gradient-to-br ${coverGradientOf(name)}`}>
      <div className="absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/15 blur-xl" />
      <div className="absolute inset-x-6 top-5 bottom-0 flex flex-col rounded-t-lg bg-card/95 p-2.5 shadow-lg">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>
        <div className="mt-2.5 h-2 w-1/2 rounded-full bg-foreground/15" />
        <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-foreground/8" />
        <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-foreground/8" />
        <div className="mt-2.5 h-4 w-14 rounded bg-primary/70" />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  chip,
}: {
  icon: typeof Globe;
  label: string;
  value: number;
  chip: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-card p-4 shadow-card">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${chip}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xl font-bold tabular-nums tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { can } = useAuth();
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTemplate, setNewTemplate] = useState<"blank" | "landing">("landing");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PageMeta | null>(null);
  const [submissionsOf, setSubmissionsOf] = useState<PageMeta | null>(null);
  const [submissions, setSubmissions] = useState<
    { id: string; data: Record<string, string>; createdAt: string }[]
  >([]);

  // 协作成员管理
  const [membersOf, setMembersOf] = useState<PageMeta | null>(null);
  const [members, setMembers] = useState<PageMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserDto[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberPick, setMemberPick] = useState<string>("");
  const [memberLevel, setMemberLevel] = useState<PageMemberLevel>("viewer");
  const [memberBusy, setMemberBusy] = useState(false);
  const [visibility, setVisibility] = useState<"inherit" | "restricted">("inherit");

  async function openMembers(page: PageMeta) {
    setMembersOf(page);
    setMembers([]);
    setMemberPick("");
    setMemberLevel("viewer");
    setVisibility(page.visibility === "restricted" ? "restricted" : "inherit");
    setMembersLoading(true);
    try {
      const [members, users] = await Promise.all([listPageMembers(page.id), listUsers()]);
      setMembers(members);
      setAllUsers(users);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载协作成员失败");
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleToggleVisibility(v: boolean) {
    if (!membersOf) return;
    const next = v ? "restricted" : "inherit";
    setVisibility(next);
    try {
      await updatePageVisibility(membersOf.id, next);
      toast.success(v ? "已限制访问:仅协作成员可见" : "已恢复:有页面权限的角色均可见");
      setMembersOf({ ...membersOf, visibility: next });
      setPages((prev) =>
        prev.map((p) => (p.id === membersOf.id ? { ...p, visibility: next } : p)),
      );
    } catch (e) {
      setVisibility(next === "restricted" ? "inherit" : "restricted");
      toast.error(e instanceof Error ? e.message : "修改失败");
    }
  }

  async function handleAddMember() {
    if (!membersOf || !memberPick) return;
    setMemberBusy(true);
    try {
      const member = await upsertPageMember(membersOf.id, memberPick, memberLevel);
      setMembers((prev) => [...prev.filter((m) => m.userId !== member.userId), member]);
      setMemberPick("");
      toast.success("已添加协作成员");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "添加失败");
    } finally {
      setMemberBusy(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!membersOf) return;
    try {
      await removePageMember(membersOf.id, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "移除失败");
    }
  }

  const refresh = useCallback(async () => {
    try {
      setPages(await listPages());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载页面列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const page = await createPage(newName.trim(), newTemplate);
      toast.success("页面已创建");
      setCreateOpen(false);
      setNewName("");
      window.location.href = `/editor/${page.id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deletePage(deleteTarget.id);
      toast.success(`已删除「${deleteTarget.name}」`);
      setDeleteTarget(null);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  }

  async function openSubmissions(page: PageMeta) {
    setSubmissionsOf(page);
    setSubmissions([]);
    try {
      setSubmissions(await getSubmissions(page.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载提交数据失败");
    }
  }

  const fieldKeys =
    submissions.length > 0 ? Object.keys(submissions[0].data ?? {}) : [];
  const publishedCount = pages.filter((p) => p.status === "published").length;

  // 守卫校验中(未登录会被跳转),先展示骨架避免闪现内容
  if (authLoading) {
    return (
      <div className="relative min-h-screen">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-500/10 via-indigo-500/[0.04] to-transparent" />
        <div className="relative mx-auto max-w-6xl space-y-6 px-6 py-10">
          <Skeleton className="h-11 w-64 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-[74px] rounded-xl" />
            <Skeleton className="h-[74px] rounded-xl" />
            <Skeleton className="h-[74px] rounded-xl" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* 顶部品牌氛围光 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indigo-500/10 via-indigo-500/[0.04] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient shadow-brand">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">低代码建站平台</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                拖拽搭建官网页面，一键发布上线
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {can("page:create") ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                新建页面
              </Button>
            ) : null}
            <UserMenu />
          </div>
        </header>

        {/* 统计条 */}
        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-[74px] rounded-xl" />
            <Skeleton className="h-[74px] rounded-xl" />
            <Skeleton className="h-[74px] rounded-xl" />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={LayoutTemplate}
              label="页面总数"
              value={pages.length}
              chip="bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
            />
            <StatCard
              icon={Rocket}
              label="已发布"
              value={publishedCount}
              chip="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            />
            <StatCard
              icon={FileText}
              label="草稿"
              value={pages.length - publishedCount}
              chip="bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
            />
          </div>
        )}

        {/* 页面列表 */}
        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : pages.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-5 rounded-2xl bg-card py-20 text-center shadow-card">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-brand">
              <LayoutTemplate className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="font-semibold">还没有任何页面</p>
              <p className="mt-1 text-sm text-muted-foreground">
                创建第一个页面，开始搭建你的官网
              </p>
            </div>
            {can("page:create") ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                新建页面
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="mt-10 flex items-center gap-2">
              <h2 className="text-sm font-semibold">全部页面</h2>
              <Badge variant="secondary">{pages.length}</Badge>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="group flex flex-col overflow-hidden rounded-xl bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10"
                >
                  <PageCover name={page.name} />

                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold">{page.name}</h3>
                      <div className="flex shrink-0 items-center gap-1">
                        {page.visibility === "restricted" ? (
                          <Badge variant="outline" className="gap-1">
                            <UsersRound className="h-3 w-3" />
                            协作
                          </Badge>
                        ) : null}
                        <Badge variant={page.status === "published" ? "success" : "secondary"}>
                          <span
                            className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                              page.status === "published"
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/60"
                            }`}
                          />
                          {page.status === "published" ? "已发布" : "草稿"}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      更新于 {formatTime(page.updatedAt)}
                    </p>

                    <div className="mt-3 flex-1 text-sm">
                      {page.status === "published" && page.slug ? (
                        <a
                          href={`/p/${page.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          /p/{page.slug}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">未发布</span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      {page.access === "editor" ? (
                        <Button asChild size="sm" className="flex-1">
                          <Link href={`/editor/${page.id}`}>
                            <Pencil />
                            编辑
                          </Link>
                        </Button>
                      ) : page.access === "viewer" ? (
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link href={`/editor/${page.id}`}>
                            查看
                          </Link>
                        </Button>
                      ) : null}
                      {page.status === "published" && page.access === "editor" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await unpublishPage(page.id);
                              toast.success("已下线");
                              void refresh();
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "下线失败");
                            }
                          }}
                        >
                          下线
                        </Button>
                      ) : null}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="更多操作">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void openSubmissions(page)}>
                            <Table2 />
                            提交数据
                          </DropdownMenuItem>
                          {can("page:share") ? (
                            <DropdownMenuItem onClick={() => void openMembers(page)}>
                              <UsersRound />
                              协作成员
                            </DropdownMenuItem>
                          ) : null}
                          {can("page:create") ? (
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  await duplicatePage(page.id);
                                  toast.success("已复制");
                                  void refresh();
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : "复制失败");
                                }
                              }}
                            >
                              <Copy />
                              创建副本
                            </DropdownMenuItem>
                          ) : null}
                          {can("page:delete") ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(page)}
                              >
                                <Trash2 />
                                删除
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 新建页面 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新建页面</DialogTitle>
            <DialogDescription>选择一个起点，之后可以随意增删组件</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="page-name">页面名称</Label>
              <Input
                id="page-name"
                value={newName}
                placeholder="如：官网首页"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>起始模板</Label>
              <Select value={newTemplate} onValueChange={(v) => setNewTemplate(v as "blank" | "landing")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landing">官网落地页（推荐）</SelectItem>
                  <SelectItem value="blank">空白页面</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void handleCreate()} disabled={!newName.trim() || creating}>
              {creating ? "创建中…" : "创建并编辑"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>删除页面</DialogTitle>
            <DialogDescription>
              确定删除「{deleteTarget?.name}」？该操作不可恢复，已发布的链接也会一并失效。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 提交数据 */}
      <Dialog open={!!submissionsOf} onOpenChange={(v) => !v && setSubmissionsOf(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>提交数据 — {submissionsOf?.name}</DialogTitle>
            <DialogDescription>页面内联系表单收集到的访客信息</DialogDescription>
          </DialogHeader>
          {submissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无提交数据</p>
          ) : (
            <div className="max-h-80 overflow-auto rounded-lg bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {fieldKeys.map((k) => (
                      <th key={k} className="px-3 py-2 text-left font-medium">
                        {k}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/8">
                  {submissions.map((s) => (
                    <tr key={s.id}>
                      {fieldKeys.map((k) => (
                        <td key={k} className="max-w-40 truncate px-3 py-2">
                          {s.data?.[k]}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatTime(s.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 协作成员 */}
      <Dialog open={!!membersOf} onOpenChange={(v) => !v && setMembersOf(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>协作成员 — {membersOf?.name}</DialogTitle>
            <DialogDescription>
              把单个用户加为该页面的编辑者或查看者,不受其全局角色限制
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <div>
              <Label htmlFor="m-visibility">限制访问</Label>
              <p className="text-xs text-muted-foreground">
                开启后仅协作成员与站点维护者可见此页面
              </p>
            </div>
            <Switch
              id="m-visibility"
              checked={visibility === "restricted"}
              onCheckedChange={(v) => void handleToggleVisibility(v)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>成员列表</Label>
            {membersLoading ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            ) : members.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                还没有协作成员,从下方添加
              </p>
            ) : (
              <div className="max-h-56 space-y-2 overflow-auto pr-1">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                      {(m.name || m.username).slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{m.name || m.username}</div>
                      <div className="text-xs text-muted-foreground">@{m.username}</div>
                    </div>
                    <Select
                      value={m.level}
                      onValueChange={async (level) => {
                        try {
                          const updated = await upsertPageMember(
                            membersOf!.id,
                            m.userId,
                            level as PageMemberLevel,
                          );
                          setMembers((prev) =>
                            prev.map((x) => (x.userId === updated.userId ? updated : x)),
                          );
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "修改失败");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">编辑者</SelectItem>
                        <SelectItem value="viewer">查看者</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      title="移除成员"
                      onClick={() => void handleRemoveMember(m.userId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>添加成员</Label>
            <div className="flex items-center gap-2">
              <Select value={memberPick} onValueChange={setMemberPick}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="选择用户" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers
                    .filter((u) => u.enabled && !members.some((m) => m.userId === u.id))
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.username}（@{u.username}）
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={memberLevel} onValueChange={(v) => setMemberLevel(v as PageMemberLevel)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">编辑者</SelectItem>
                  <SelectItem value="viewer">查看者</SelectItem>
                </SelectContent>
              </Select>
              <Button disabled={!memberPick || memberBusy} onClick={() => void handleAddMember()}>
                添加
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              编辑者:可编辑草稿并发布该页;查看者:只读。成员权限仅对本页面生效,全局角色权限不受影响。
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
