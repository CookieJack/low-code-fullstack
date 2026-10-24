"use client";

import { ChevronDown, ChevronUp, Minus, Plus, RotateCcw, X } from "lucide-react";
import { getMaterial } from "@lc/materials";
import type { NodeStyle, PropField } from "@lc/schema";
import {
  cn,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@lc/ui";
import { useEditorStore } from "@/lib/editor-store";
import { findNode } from "@/lib/tree";
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

/* ------------------------------------------------------------------ */
/* 通用样式设置:五个 tab 中的字体/边框/背景/间距                            */
/* ------------------------------------------------------------------ */

const ALL_STYLE_KEYS = [
  "background",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "color",
  "textAlign",
  "lineHeight",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "borderRadius",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
] as const;

/** 字体/字重等 Select 的"默认"哨兵值(Radix Select 不允许空字符串 value) */
const DEFAULT_OPT = "__default__";

const FONT_OPTIONS = [
  { label: "无衬线", value: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { label: "衬线", value: "Georgia, 'Times New Roman', 'Songti SC', 'SimSun', serif" },
  { label: "等宽", value: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  { label: "楷体", value: "'Kaiti SC', STKaiti, KaiTi, cursive" },
];

function parsePx(v: string | undefined): number | undefined {
  if (typeof v !== "string") return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

function StyleSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  zeroLabel,
}: {
  label: string;
  /** undefined = 未设置(显示"默认") */
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** 传入后 0 显示该文案(通常配合清除样式值) */
  zeroLabel?: string;
}) {
  const display =
    value === undefined
      ? "默认"
      : value === 0 && zeroLabel
        ? zeroLabel
        : `${value}px`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">{display}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value ?? 0]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={value ?? DEFAULT_OPT}
        onValueChange={(v) => onChange(v === DEFAULT_OPT ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="默认" />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function useStyleSetter(nodeId: string) {
  const updateStyle = useEditorStore((s) => s.updateStyle);
  return (key: keyof NodeStyle, v: unknown) =>
    updateStyle(nodeId, { [key]: v } as Partial<NodeStyle>);
}

function FontTab({ nodeId, style }: { nodeId: string; style: NodeStyle }) {
  const set = useStyleSetter(nodeId);
  const lh = typeof style.lineHeight === "string" ? parseFloat(style.lineHeight) : undefined;

  return (
    <div className="space-y-4">
      <SelectField
        label="字体"
        value={style.fontFamily}
        onChange={(v) => set("fontFamily", v)}
      >
        <SelectItem value={DEFAULT_OPT}>默认(跟随主题)</SelectItem>
        {FONT_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectField>

      <StyleSlider
        label="字号"
        value={parsePx(style.fontSize)}
        min={12}
        max={64}
        step={1}
        onChange={(v) => set("fontSize", `${v}px`)}
      />

      <SelectField label="字重" value={style.fontWeight} onChange={(v) => set("fontWeight", v)}>
        <SelectItem value={DEFAULT_OPT}>默认</SelectItem>
        <SelectItem value="300">细体 300</SelectItem>
        <SelectItem value="400">常规 400</SelectItem>
        <SelectItem value="500">中等 500</SelectItem>
        <SelectItem value="600">半粗 600</SelectItem>
        <SelectItem value="700">粗体 700</SelectItem>
      </SelectField>

      <ColorField
        label="文字颜色"
        value={style.color}
        placeholder="默认"
        fallback="#0f172a"
        onChange={(v) => set("color", v)}
      />

      <div className="space-y-1.5">
        <Label>文字对齐</Label>
        <div className="flex rounded-lg bg-muted p-1">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              className={cn(
                "flex-1 rounded-md py-1.5 text-xs font-medium transition",
                style.textAlign === a
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => set("textAlign", style.textAlign === a ? undefined : a)}
            >
              {a === "left" ? "居左" : a === "center" ? "居中" : "居右"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>行高</Label>
          <span className="text-xs text-muted-foreground">
            {lh !== undefined && !Number.isNaN(lh) ? lh.toFixed(2) : "默认"}
          </span>
        </div>
        <Slider
          min={1}
          max={2.4}
          step={0.05}
          value={[lh !== undefined && !Number.isNaN(lh) ? lh : 1.5]}
          onValueChange={([v]) => set("lineHeight", String(v))}
        />
      </div>
    </div>
  );
}

function BorderTab({ nodeId, style }: { nodeId: string; style: NodeStyle }) {
  const set = useStyleSetter(nodeId);

  return (
    <div className="space-y-4">
      <StyleSlider
        label="边框宽度"
        value={parsePx(style.borderWidth)}
        min={0}
        max={16}
        step={1}
        zeroLabel="无"
        onChange={(v) => set("borderWidth", v === 0 ? undefined : `${v}px`)}
      />

      <SelectField label="边框样式" value={style.borderStyle} onChange={(v) => set("borderStyle", v)}>
        <SelectItem value={DEFAULT_OPT}>实线(默认)</SelectItem>
        <SelectItem value="solid">实线</SelectItem>
        <SelectItem value="dashed">虚线</SelectItem>
        <SelectItem value="dotted">点线</SelectItem>
      </SelectField>

      <ColorField
        label="边框颜色"
        value={style.borderColor}
        placeholder="默认"
        fallback="#e2e8f0"
        onChange={(v) => set("borderColor", v)}
      />

      <StyleSlider
        label="圆角"
        value={parsePx(style.borderRadius)}
        min={0}
        max={48}
        step={2}
        zeroLabel="无"
        onChange={(v) => set("borderRadius", v === 0 ? undefined : `${v}px`)}
      />
    </div>
  );
}

function BackgroundTab({ nodeId, style }: { nodeId: string; style: NodeStyle }) {
  const set = useStyleSetter(nodeId);

  return (
    <ColorField
      label="背景色"
      value={style.background}
      placeholder="默认"
      fallback="#ffffff"
      onChange={(v) => set("background", v)}
    />
  );
}

function SpacingTab({ nodeId, style }: { nodeId: string; style: NodeStyle }) {
  const set = useStyleSetter(nodeId);

  return (
    <div className="space-y-4">
      {(
        [
          ["paddingTop", "上内边距"],
          ["paddingBottom", "下内边距"],
          ["paddingLeft", "左内边距"],
          ["paddingRight", "右内边距"],
        ] as const
      ).map(([key, label]) => (
        <StyleSlider
          key={key}
          label={label}
          value={parsePx(style[key])}
          min={0}
          max={240}
          step={8}
          onChange={(v) => set(key, `${v}px`)}
        />
      ))}
    </div>
  );
}

export function PropertyPanel() {
  const node = useEditorStore((s) => findNode(s.schema.nodes, s.selectedId));
  const schema = useEditorStore((s) => s.schema);
  const updateProps = useEditorStore((s) => s.updateProps);
  const updateStyle = useEditorStore((s) => s.updateStyle);
  const updateTitle = useEditorStore((s) => s.updateTitle);
  const def = node ? getMaterial(node.type) : undefined;
  const style = node?.style ?? {};
  const hasStyle = Object.values(style).some((v) => v !== undefined);

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-hidden bg-background">
      {node && def ? (
        <>
          <div className="flex items-center gap-2 px-4 py-3">
            <span>{def.icon}</span>
            <span className="text-sm font-semibold">{def.title}</span>
            <span className="ml-auto text-xs text-muted-foreground">属性设置</span>
            {hasStyle ? (
              <button
                title="重置全部样式"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() =>
                  updateStyle(
                    node.id,
                    Object.fromEntries(ALL_STYLE_KEYS.map((k) => [k, undefined])) as Partial<NodeStyle>,
                  )
                }
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Tabs defaultValue="content" className="min-h-0 flex-1 flex-col gap-0">
            <TabsList className="mx-4 shrink-0">
              <TabsTrigger value="content">内容</TabsTrigger>
              <TabsTrigger value="font">字体</TabsTrigger>
              <TabsTrigger value="border">边框</TabsTrigger>
              <TabsTrigger value="background">背景</TabsTrigger>
              <TabsTrigger value="spacing">间距</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
              {def.propSchema.length > 0 ? (
                def.propSchema.map((field) => (
                  <FieldControl
                    key={field.key}
                    field={field}
                    value={node.props[field.key]}
                    onChange={(v) => updateProps(node.id, field.key, v)}
                  />
                ))
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  该区块没有可配置的内容属性,可切换到其他标签调整样式。
                </p>
              )}
            </TabsContent>
            <TabsContent value="font" className="min-h-0 flex-1 overflow-auto p-4">
              <FontTab nodeId={node.id} style={style} />
            </TabsContent>
            <TabsContent value="border" className="min-h-0 flex-1 overflow-auto p-4">
              <BorderTab nodeId={node.id} style={style} />
            </TabsContent>
            <TabsContent value="background" className="min-h-0 flex-1 overflow-auto p-4">
              <BackgroundTab nodeId={node.id} style={style} />
            </TabsContent>
            <TabsContent value="spacing" className="min-h-0 flex-1 overflow-auto p-4">
              <SpacingTab nodeId={node.id} style={style} />
            </TabsContent>
          </Tabs>
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
