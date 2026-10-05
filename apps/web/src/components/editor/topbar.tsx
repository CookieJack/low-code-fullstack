"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Monitor,
  Rocket,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Separator,
} from "@lc/ui";
import { publishPage } from "@/lib/api";
import { saveNow } from "@/lib/editor-save";
import { useEditorStore, type Device } from "@/lib/editor-store";
import { ThemeToggle } from "@/components/theme/theme-toggle";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `page-${nanoid(5).toLowerCase()}`;
}

const DEVICES: { key: Device; icon: typeof Monitor; label: string }[] = [
  { key: "desktop", icon: Monitor, label: "桌面" },
  { key: "tablet", icon: Tablet, label: "平板" },
  { key: "mobile", icon: Smartphone, label: "手机" },
];

function PublishDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const pageId = useEditorStore((s) => s.pageId);
  const pageName = useEditorStore((s) => s.pageName);
  const [slug, setSlug] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ slug: string; url: string } | null>(null);

  const effectiveSlug = slug ?? slugify(pageName);

  async function handlePublish() {
    if (!pageId) return;
    setPublishing(true);
    try {
      const ok = await saveNow();
      if (!ok) throw new Error("保存失败,请重试");
      const res = await publishPage(pageId, effectiveSlug);
      setResult({ slug: res.slug, url: res.url });
      toast.success("发布成功!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setResult(null);
      }}
    >
      <DialogContent className="max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                发布成功
              </DialogTitle>
              <DialogDescription>你的页面已经上线,可以把链接分享给任何人</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
              <code className="flex-1 truncate text-sm">/p/{result.slug}</code>
              <Button
                size="icon"
                variant="ghost"
                title="复制链接"
                onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/p/${result.slug}`);
                  toast.success("链接已复制");
                }}
              >
                <Copy />
              </Button>
              <Button size="icon" variant="ghost" title="打开" asChild>
                <a href={result.url} target="_blank" rel="noreferrer">
                  <ExternalLink />
                </a>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                完成
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>发布页面</DialogTitle>
              <DialogDescription>
                发布后生成可公开访问的链接;再次发布将更新线上内容
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="publish-slug">访问路径</Label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-muted-foreground">/p/</span>
                <Input
                  id="publish-slug"
                  value={effectiveSlug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="my-page"
                />
              </div>
              <p className="text-xs text-muted-foreground">仅支持小写字母、数字和中划线</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={() => void handlePublish()} disabled={publishing || !effectiveSlug}>
                <Rocket />
                {publishing ? "发布中…" : "立即发布"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function Topbar() {
  const pageName = useEditorStore((s) => s.pageName);
  const device = useEditorStore((s) => s.device);
  const setDevice = useEditorStore((s) => s.setDevice);
  const previewMode = useEditorStore((s) => s.previewMode);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
  const dirty = useEditorStore((s) => s.dirty);
  const saving = useEditorStore((s) => s.saving);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const pageId = useEditorStore((s) => s.pageId);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past.length);
  const future = useEditorStore((s) => s.future.length);
  const [publishOpen, setPublishOpen] = useState(false);

  const saveLabel = saving
    ? "保存中…"
    : dirty
      ? "未保存"
      : lastSavedAt
        ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
        : "";

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 bg-card px-4 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient shadow-brand">
        <Globe className="h-4 w-4 text-white" />
      </div>
      <Button asChild size="icon" variant="ghost" title="返回页面列表">
        <Link href="/">
          <ArrowLeft />
        </Link>
      </Button>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{pageName || "未命名页面"}</div>
        <div
          className={`text-xs ${dirty ? "text-amber-600" : "text-muted-foreground"}`}
          data-testid="save-status"
        >
          {saveLabel}
        </div>
      </div>

      <div className="mx-2 flex items-center gap-1">
        <Button size="icon" variant="ghost" title="撤销 (Ctrl+Z)" disabled={past === 0} onClick={undo}>
          <Undo2 />
        </Button>
        <Button size="icon" variant="ghost" title="重做 (Ctrl+Shift+Z)" disabled={future === 0} onClick={redo}>
          <Redo2 />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center rounded-lg bg-muted p-0.5">
        {DEVICES.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            title={label}
            onClick={() => setDevice(key)}
            className={`rounded-md p-1.5 transition ${
              device === key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>

      <Button
        variant={previewMode ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setPreviewMode(!previewMode)}
        title="预览模式(隐藏编辑辅助)"
      >
        {previewMode ? <EyeOff /> : <Eye />}
        {previewMode ? "退出预览" : "预览"}
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Button variant="outline" size="sm" asChild disabled={!pageId}>
          <a href={`/api/export/${pageId}`} title="导出当前草稿为静态 HTML">
            <Download />
            导出 HTML
          </a>
        </Button>
        <Button
          size="sm"
          className="bg-brand-gradient text-white shadow-brand hover:opacity-90"
          onClick={() => setPublishOpen(true)}
        >
          <Rocket />
          发布
        </Button>
      </div>

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} />
    </header>
  );
}
