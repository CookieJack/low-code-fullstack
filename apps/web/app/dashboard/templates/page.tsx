"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ImagePlus,
  LayoutTemplate,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toPng } from "html-to-image";
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
  Textarea,
} from "@lc/ui";
import { Renderer } from "@lc/renderer";
import {
  TEMPLATE_CATEGORY_LABELS,
  type PageMeta,
  type PageSchema,
  type TemplateCategory,
  type TemplateDto,
} from "@lc/schema";
import {
  createTemplate,
  deleteTemplate,
  getPage,
  listPages,
  listTemplatesManage,
  updateTemplate,
  uploadImage,
} from "@/lib/api";
import { useAuth, useRequireAuth } from "@/components/auth/auth-provider";
import { UserMenu } from "@/components/auth/user-menu";

const CAPTURE_WIDTH = 1200;
const CAPTURE_HEIGHT = 750;
/** 1×1 透明 PNG:html-to-image 对加载失败图片的兜底占位 */
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

/** 封面占位:未截图的模板显示品牌渐变 + 图标 */
function CoverPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-brand-gradient text-white/80">
      <LayoutTemplate className="h-8 w-8" />
      <span className="text-xs">暂无封面</span>
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useRequireAuth();
  const { can } = useAuth();
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<"all" | TemplateCategory>("all");

  // 新建模板
  const [createOpen, setCreateOpen] = useState(false);
  const [pages, setPages] = useState<PageMeta[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "other" });
  const [sourceId, setSourceId] = useState("");
  const [captureSchema, setCaptureSchema] = useState<PageSchema | null>(null);
  const [captureState, setCaptureState] = useState<"idle" | "capturing" | "done" | "failed">("idle");
  const [captureError, setCaptureError] = useState<string>("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  // 编辑模板
  const [editTarget, setEditTarget] = useState<TemplateDto | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", category: "other" });
  const [editThumbnail, setEditThumbnail] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TemplateDto | null>(null);

  // 无 template:manage 权限,送回后台首页
  useEffect(() => {
    if (!authLoading && user && !can("template:manage")) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, can, router]);

  const refresh = useCallback(async () => {
    try {
      setTemplates(await listTemplatesManage());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载模板列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && can("template:manage")) void refresh();
  }, [user, can, refresh]);

  /* ---------------- 新建:从页面导入 + 自动截图封面 ---------------- */

  function resetCreateForm() {
    setForm({ name: "", description: "", category: "other" });
    setSourceId("");
    setCaptureSchema(null);
    setThumbnail(null);
    setCaptureState("idle");
  }

  function openCreate() {
    resetCreateForm();
    setCreateOpen(true);
    if (pages.length === 0) {
      setPagesLoading(true);
      listPages()
        .then(setPages)
        .catch((e) => toast.error(e instanceof Error ? e.message : "加载页面列表失败"))
        .finally(() => setPagesLoading(false));
    }
  }

  async function handleSourceChange(id: string) {
    setSourceId(id);
    setCaptureState("idle");
    setThumbnail(null);
    setCaptureSchema(null);
    if (!id) return;
    try {
      const detail = await getPage(id);
      // 名称留空时用来源页面名预填
      setForm((f) => (f.name.trim() ? f : { ...f, name: detail.name }));
      setCaptureSchema(detail.schema);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载页面内容失败");
    }
  }

  // 屏外预览渲染完成后自动截图并上传封面
  useEffect(() => {
    if (!createOpen || !captureSchema) return;
    setCaptureState("capturing");
    const timer = window.setTimeout(async () => {
      try {
        const el = captureRef.current;
        if (!el) throw new Error("预览未就绪");
        const dataUrl = await toPng(el, {
          backgroundColor: "#ffffff",
          cacheBust: true,
          // 页面里个别失效图片(如历史遗留的坏 logo)不中断整体截图,降级为透明占位
          imagePlaceholder: TRANSPARENT_PIXEL,
        });
        const blob = await (await fetch(dataUrl)).blob();
        const res = await uploadImage(
          new File([blob], "template-cover.png", { type: "image/png" }),
        );
        setThumbnail(res.url);
        setCaptureState("done");
      } catch (err) {
        console.error("[template-capture] 封面截图失败:", err);
        setCaptureError(err instanceof Error ? err.message : String(err));
        setCaptureState("failed");
        toast.error("封面截图失败,创建后可在编辑中手动上传封面");
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [createOpen, captureSchema]);

  async function handleCreate() {
    if (!form.name.trim()) return;
    if (!captureSchema) {
      toast.error("请选择来源页面");
      return;
    }
    setCreating(true);
    try {
      await createTemplate({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        thumbnail,
        schema: captureSchema,
      });
      toast.success("模板已创建");
      setCreateOpen(false);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  /* ---------------- 编辑:元信息 + 手动更换封面 ---------------- */

  function openEdit(t: TemplateDto) {
    setEditTarget(t);
    setEditForm({ name: t.name, description: t.description, category: t.category });
    setEditThumbnail(t.thumbnail);
  }

  async function handleCoverUpload(file: File) {
    setUploading(true);
    try {
      const res = await uploadImage(file);
      setEditThumbnail(res.url);
      toast.success("封面上传成功,保存后生效");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "封面上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateTemplate(editTarget.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        thumbnail: editThumbnail,
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

  async function handleToggle(t: TemplateDto, enabled: boolean) {
    setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, enabled } : x)));
    try {
      await updateTemplate(t.id, { enabled });
      toast.success(enabled ? "模板已启用" : "模板已停用,新建页面将不再展示");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
      void refresh();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTemplate(deleteTarget.id);
      toast.success(`已删除模板「${deleteTarget.name}」`);
      setDeleteTarget(null);
      void refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  }

  /* ---------------- 渲染 ---------------- */

  if (authLoading || (user && !can("template:manage"))) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-6 py-10">
        <Skeleton className="h-11 w-48 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const filtered =
    categoryFilter === "all" ? templates : templates.filter((t) => t.category === categoryFilter);

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
              <h1 className="text-xl font-bold tracking-tight">模板库</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                从现有页面沉淀模板,供新建页面时一键套用
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openCreate}>
              <Plus />
              新建模板
            </Button>
            <UserMenu />
          </div>
        </header>

        {/* 分类筛选 */}
        <div className="mt-6 flex flex-wrap gap-2">
          {(["all", ...Object.keys(TEMPLATE_CATEGORY_LABELS)] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryFilter(key as "all" | TemplateCategory)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                categoryFilter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {key === "all" ? "全部" : TEMPLATE_CATEGORY_LABELS[key as TemplateCategory]}
            </button>
          ))}
        </div>

        {/* 模板卡片 */}
        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center rounded-xl bg-card py-16 text-center shadow-card">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {templates.length === 0
                ? "模板库还是空的,点击「新建模板」从现有页面导入一个吧"
                : "该分类下暂无模板"}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <div key={t.id} className="overflow-hidden rounded-xl bg-card shadow-card">
                <div className="relative aspect-[16/10] bg-muted">
                  {t.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.thumbnail}
                      alt={`模板「${t.name}」封面`}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <CoverPlaceholder />
                  )}
                  <Badge className="absolute left-3 top-3">
                    {TEMPLATE_CATEGORY_LABELS[t.category]}
                  </Badge>
                  {!t.enabled ? (
                    <Badge variant="secondary" className="absolute right-3 top-3">
                      已停用
                    </Badge>
                  ) : null}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    {t.description ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">已被使用 {t.useCount} 次</div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={t.enabled}
                        onCheckedChange={(v) => void handleToggle(t, v)}
                        aria-label={`启用/停用模板 ${t.name}`}
                      />
                      {t.enabled ? "启用中" : "已停用"}
                    </label>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                        编辑
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        title="删除模板"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新建模板 */}
      <Dialog open={createOpen} onOpenChange={(v) => (v ? setCreateOpen(true) : setCreateOpen(false))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建模板</DialogTitle>
            <DialogDescription>
              选择一个现有页面作为模板内容,系统会自动截图生成封面
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>来源页面</Label>
              <Select value={sourceId} onValueChange={(v) => void handleSourceChange(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={pagesLoading ? "加载页面中…" : "选择要导入的页面"} />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-name">模板名称</Label>
              <Input
                id="t-name"
                value={form.name}
                placeholder="如:官网落地页"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <div className="space-y-1.5">
                <Label>分类</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-desc">描述</Label>
                <Input
                  id="t-desc"
                  value={form.description}
                  placeholder="可选,展示在模板卡片上"
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>封面预览</Label>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="aspect-[16/10] w-32 overflow-hidden rounded-md border bg-background">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt="模板封面" className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      {captureState === "capturing"
                        ? "截图生成中…"
                        : captureState === "failed"
                          ? `截图失败:${captureError.slice(0, 60)}`
                          : "选择页面后自动生成"}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  封面按页面首屏(1200×750)自动截图,创建后可随时更换。
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={creating || !sourceId || !form.name.trim() || captureState === "capturing"}
            >
              {creating ? "创建中…" : "创建模板"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑模板 */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑模板 — {editTarget?.name}</DialogTitle>
            <DialogDescription>
              修改名称、分类、描述与封面;模板内容如需调整请删除后重新导入
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-tname">模板名称</Label>
              <Input
                id="e-tname"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <div className="space-y-1.5">
                <Label>分类</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(v) => setEditForm({ ...editForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-tdesc">描述</Label>
                <Input
                  id="e-tdesc"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>封面</Label>
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="aspect-[16/10] w-32 overflow-hidden rounded-md border bg-background">
                  {editThumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={editThumbnail}
                      alt="模板封面"
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <CoverPlaceholder />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {uploading ? "上传中…" : "上传新封面"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleCoverUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {editThumbnail ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="block h-auto px-0 text-xs text-muted-foreground"
                      onClick={() => setEditThumbnail(null)}
                    >
                      清除封面
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || !editForm.name.trim()}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>删除模板</DialogTitle>
            <DialogDescription>
              确定删除模板「{deleteTarget?.name}」？已用它创建的页面不受影响。
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

      {/* 屏外渲染来源页面预览,用于生成封面截图 */}
      {createOpen && captureSchema ? (
        <div aria-hidden className="pointer-events-none fixed left-[-99999px] top-0">
          <div
            ref={captureRef}
            className="w-[1200px] overflow-hidden bg-white"
            style={{ height: CAPTURE_HEIGHT }}
          >
            <Renderer schema={captureSchema} mode="static" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
