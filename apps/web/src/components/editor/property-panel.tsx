"use client";

import { ChevronDown, ChevronUp, Minus, Plus, RotateCcw, Settings2, X } from "lucide-react";
import { getMaterial } from "@lc/materials";
import type { PropField } from "@lc/schema";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
  Switch,
  Textarea,
} from "@lc/ui";
import { useEditorStore } from "@/lib/editor-store";
import { ColorField } from "./color-field";
import { ImageField } from "./image-field";

type ArrayField = Extract<PropField, { type: "array" }>;

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: PropField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "text":
    case "url":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <Input
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <Textarea
            rows={field.rows ?? 3}
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "image":
      return (
        <ImageField
          label={field.label}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={onChange}
        />
      );
    case "color":
      return (
        <ColorField
          label={field.label}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <Input
            type="number"
            value={typeof value === "number" || typeof value === "string" ? String(value) : ""}
            min={field.min}
            max={field.max}
            step={field.step}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          />
        </div>
      );
    case "boolean":
      return (
        <div className="flex items-center justify-between">
          <Label>{field.label}</Label>
          <Switch checked={value === true} onCheckedChange={(v) => onChange(v)} />
        </div>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <Select value={typeof value === "string" ? value : ""} onValueChange={(v) => onChange(v)}>
            <SelectTrigger>
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case "array":
      return <ArrayEditor field={field} value={value} onChange={onChange} />;
    default:
      return null;
  }
}

function ArrayEditor({
  field,
  value,
  onChange,
}: {
  field: ArrayField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const items = (Array.isArray(value) ? value : []) as Record<string, unknown>[];

  const patchItem = (index: number, key: string, v: unknown) => {
    const arr = [...items];
    arr[index] = { ...arr[index], [key]: v };
    onChange(arr);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const arr = [...items];
    const [it] = arr.splice(from, 1);
    arr.splice(to, 0, it);
    onChange(arr);
  };

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        <span className="ml-1 font-normal text-muted-foreground">({items.length})</span>
      </Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="space-y-2.5 rounded-lg bg-card p-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="max-w-40 truncate text-xs font-medium text-muted-foreground">
                {String(item[field.itemLabelKey] ?? `第 ${i + 1} 项`)}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  title="上移"
                  disabled={i === 0}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
                  onClick={() => move(i, i - 1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  title="下移"
                  disabled={i === items.length - 1}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
                  onClick={() => move(i, i + 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  title="移除"
                  className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {field.fields.map((f) => (
              <FieldControl
                key={f.key}
                field={f}
                value={item[f.key]}
                onChange={(v) => patchItem(i, f.key, v)}
              />
            ))}
          </div>
        ))}
      </div>
      <button
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed py-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        onClick={() => onChange([...items, structuredClone(field.defaultItem)])}
      >
        <Plus className="h-3.5 w-3.5" />
        添加一项
      </button>
    </div>
  );
}

function StyleSection({ nodeId }: { nodeId: string }) {
  const node = useEditorStore((s) => s.schema.nodes.find((n) => n.id === nodeId));
  const updateStyle = useEditorStore((s) => s.updateStyle);
  if (!node) return null;
  const style = node.style ?? {};
  const pt = typeof style.paddingTop === "string" ? parseInt(style.paddingTop) || 0 : undefined;
  const pb = typeof style.paddingBottom === "string" ? parseInt(style.paddingBottom) || 0 : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Settings2 className="h-3.5 w-3.5" />
          区块样式
        </p>
        {Object.keys(style).length > 0 ? (
          <button
            title="重置样式"
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() =>
              updateStyle(nodeId, { background: undefined, paddingTop: undefined, paddingBottom: undefined })
            }
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <ColorField
        label="背景色"
        value={typeof style.background === "string" ? style.background : undefined}
        placeholder="默认"
        fallback="#ffffff"
        onChange={(v) => updateStyle(nodeId, { background: v })}
      />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>上内边距</Label>
          <span className="text-xs text-muted-foreground">{pt !== undefined ? `${pt}px` : "默认"}</span>
        </div>
        <Slider
          min={0}
          max={240}
          step={8}
          value={[pt ?? 0]}
          onValueChange={([v]) => updateStyle(nodeId, { paddingTop: `${v}px` })}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>下内边距</Label>
          <span className="text-xs text-muted-foreground">{pb !== undefined ? `${pb}px` : "默认"}</span>
        </div>
        <Slider
          min={0}
          max={240}
          step={8}
          value={[pb ?? 0]}
          onValueChange={([v]) => updateStyle(nodeId, { paddingBottom: `${v}px` })}
        />
      </div>
    </div>
  );
}

export function PropertyPanel() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const node = useEditorStore((s) => s.schema.nodes.find((n) => n.id === s.selectedId));
  const schema = useEditorStore((s) => s.schema);
  const updateProps = useEditorStore((s) => s.updateProps);
  const updateTitle = useEditorStore((s) => s.updateTitle);
  const def = node ? getMaterial(node.type) : undefined;

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden bg-background">
      {node && def ? (
        <>
          <div className="flex items-center gap-2 px-4 py-3">
            <span>{def.icon}</span>
            <span className="text-sm font-semibold">{def.title}</span>
            <span className="ml-auto text-xs text-muted-foreground">属性设置</span>
          </div>
          <div className="flex-1 space-y-5 overflow-auto p-4">
            {def.propSchema.map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                value={node.props[field.key]}
                onChange={(v) => updateProps(node.id, field.key, v)}
              />
            ))}
            <Separator />
            <StyleSection nodeId={node.id} />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="text-sm font-semibold">页面设置</span>
          </div>
          <div className="flex-1 space-y-5 overflow-auto p-4">
            <div className="space-y-1.5">
              <Label>页面标题(SEO)</Label>
              <Input
                value={schema.title}
                placeholder="显示在浏览器标签页与搜索结果中"
                onChange={(e) => updateTitle(e.target.value)}
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              在画布中点击任意区块可编辑其属性;拖拽左上角手柄或使用工具条调整顺序。
            </p>
          </div>
        </>
      )}
    </aside>
  );
}
