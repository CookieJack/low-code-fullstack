"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button, Input, Label } from "@lc/ui";
import { uploadImage } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";

/** 图片属性控件:预览缩略图 + 平台内上传 + 手动粘贴外部 URL */
export function ImageField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const { can } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  // 上传按全局页面编辑权限判定(与服务端一致);无权限时仍可粘贴外部 URL
  const canUpload = can("page:create") || can("page:update");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败，请稍后重试");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {value ? (
        <div className="group relative overflow-hidden rounded-lg border bg-muted">
          <img src={value} alt="" className="h-28 w-full object-cover" />
          <button
            type="button"
            title="移除图片"
            className="absolute right-1.5 top-1.5 rounded-md bg-background/85 p-1 text-muted-foreground backdrop-blur transition hover:text-destructive"
            onClick={() => onChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      {canUpload ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading ? "上传中…" : "上传图片"}
          </Button>
        </>
      ) : null}
      <Input
        value={value}
        placeholder={placeholder ?? "粘贴图片 URL"}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
