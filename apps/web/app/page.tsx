"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  Globe,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Plus,
  Table2,
  Trash2,
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
} from "@lc/ui";
import type { PageMeta } from "@lc/schema";
import {
  createPage,
  deletePage,
  duplicatePage,
  getSubmissions,
  listPages,
  unpublishPage,
} from "@/lib/api";

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function DashboardPage() {
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Globe className="h-7 w-7 text-indigo-600" />
            低代码建站平台
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            拖拽搭建官网页面,一键发布上线
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          新建页面
        </Button>
      </header>

      <Separator className="my-8" />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <LayoutTemplate className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">还没有任何页面</p>
            <p className="mt-1 text-sm text-muted-foreground">
              创建第一个页面,开始搭建你的官网
            </p>
          </div>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus />
            新建页面
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="group flex flex-col rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{page.name}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    更新于 {formatTime(page.updatedAt)}
                  </p>
                </div>
                <Badge variant={page.status === "published" ? "success" : "secondary"}>
                  {page.status === "published" ? "已发布" : "草稿"}
                </Badge>
              </div>

              <div className="mt-3 flex-1 text-sm text-muted-foreground">
                {page.status === "published" && page.slug ? (
                  <a
                    href={`/p/${page.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                  >
                    /p/{page.slug}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span>未发布</span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/editor/${page.id}`}>
                    <Pencil />
                    编辑
                  </Link>
                </Button>
                {page.status === "published" ? (
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget(page)}
                    >
                      <Trash2 />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建页面 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新建页面</DialogTitle>
            <DialogDescription>选择一个起点,之后可以随意增删组件</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="page-name">页面名称</Label>
              <Input
                id="page-name"
                value={newName}
                placeholder="如:官网首页"
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
                  <SelectItem value="landing">官网落地页(推荐)</SelectItem>
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
              确定删除「{deleteTarget?.name}」?该操作不可恢复,已发布的链接也会一并失效。
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
            <div className="max-h-80 overflow-auto rounded-lg border">
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
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-t">
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
    </div>
  );
}
