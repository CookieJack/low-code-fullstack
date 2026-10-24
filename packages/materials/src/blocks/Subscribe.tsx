"use client";

import { useState } from "react";
import type { MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  subtitle: string;
  placeholder: string;
  buttonText: string;
  successText: string;
  bgColor: string;
};

function Subscribe({ props, style, mode, context }: MaterialComponentProps) {
  const {
    title = "订阅我们的动态",
    subtitle = "每周一封精选邮件,获取产品更新与建站技巧。",
    placeholder = "输入你的邮箱",
    buttonText = "订阅",
    successText = "订阅成功,欢迎加入!",
    bgColor = "#4f46e5",
  } = props as Partial<Props>;

  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const isCanvas = mode === "edit";
  const isExport = mode === "export";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isCanvas) return;
    const form = e.currentTarget;
    const data: Record<string, string> = {};
    new FormData(form).forEach((v, k) => {
      data[k] = String(v);
    });
    setState("sending");
    try {
      const res = await fetch(`${context?.formApiUrl ?? ""}/api/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: context?.pageId ?? "", componentId: context?.nodeId ?? "", data }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("success");
      form.reset();
    } catch {
      setState("error");
    }
  }

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 72, paddingBottom: 72, background: bgColor })}>
      <div className="mx-auto max-w-2xl px-6 text-center text-white">
        <h2 className="text-2xl font-bold tracking-tight @min-[768px]:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-3 text-base" style={{ opacity: 0.85 }}>{subtitle}</p> : null}

        {state === "success" ? (
          <p className="mt-6 rounded-xl bg-white/15 px-4 py-3 text-sm font-medium backdrop-blur">{successText}</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            {...(isExport
              ? {
                  "data-lc-form": `${context?.formApiUrl ?? ""}/api/forms`,
                  "data-lc-page": context?.pageId ?? "",
                  "data-lc-component": context?.nodeId ?? "",
                  "data-lc-success": successText,
                }
              : {})}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <input
              name="邮箱"
              type="email"
              required
              placeholder={placeholder}
              className="h-12 flex-1 rounded-xl bg-white/95 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:bg-white focus:ring-4 focus:ring-white/30"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="h-12 rounded-xl bg-slate-900 px-8 text-sm font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
            >
              {state === "sending" ? "提交中…" : buttonText}
            </button>
            {state === "error" ? (
              <p className="text-sm font-medium text-red-200 sm:hidden">提交失败,请稍后重试。</p>
            ) : null}
          </form>
        )}
        {state === "error" ? (
          <p className="mt-3 hidden text-sm font-medium text-red-200 sm:block">提交失败,请稍后重试。</p>
        ) : null}
        {isCanvas ? <p className="mt-4 text-xs text-white/70">编辑器内不会真实提交,发布后生效</p> : null}
      </div>
    </section>
  );
}

export default Subscribe;
