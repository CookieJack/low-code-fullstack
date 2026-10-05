"use client";

import { Input, Label } from "@lc/ui";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** 美化的颜色选择器:自定义色板覆盖原生 input[type=color],右侧可手输 hex */
export function ColorField({
  label,
  value,
  placeholder,
  fallback = "#ffffff",
  onChange,
}: {
  label: string;
  value: string | undefined;
  placeholder?: string;
  fallback?: string;
  onChange: (v: string | undefined) => void;
}) {
  const safe = typeof value === "string" && HEX_RE.test(value) ? value : fallback;

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <label
          title="点击取色"
          className="relative block h-9 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md shadow-sm transition hover:ring-2 hover:ring-ring/30"
        >
          <span className="absolute inset-0 bg-checkerboard" />
          <span className="absolute inset-0" style={{ background: safe }} />
          <input
            type="color"
            value={safe}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <Input
          value={typeof value === "string" ? value : ""}
          placeholder={placeholder ?? "#rrggbb"}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      </div>
    </div>
  );
}
