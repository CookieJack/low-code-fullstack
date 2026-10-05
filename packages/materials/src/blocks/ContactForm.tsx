"use client";

import { useState } from "react";
import type { MaterialComponentProps } from "../types";
import { sectionStyle } from "../lib/style";

type Props = {
  title: string;
  subtitle: string;
  showName: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showMessage: boolean;
  submitText: string;
  successText: string;
};

function ContactForm({ props, style, mode, context }: MaterialComponentProps) {
  const {
    title = "联系我们",
    subtitle = "留下你的信息,我们会尽快与你取得联系。",
    showName = true,
    showEmail = true,
    showPhone = false,
    showMessage = true,
    submitText = "提交",
    successText = "提交成功,感谢你的留言!",
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

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20";

  return (
    <section className="@container w-full" style={sectionStyle(style, { paddingTop: 96, paddingBottom: 96, background: "#f8fafc" })}>
      <div className="mx-auto max-w-xl px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-2 text-slate-500">{subtitle}</p> : null}

          {state === "success" ? (
            <div className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successText}
            </div>
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
              className="mt-6 space-y-4"
            >
              {showName ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">姓名</label>
                  <input name="姓名" required placeholder="你的姓名" className={inputCls} />
                </div>
              ) : null}
              {showEmail ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">邮箱</label>
                  <input name="邮箱" type="email" required placeholder="you@example.com" className={inputCls} />
                </div>
              ) : null}
              {showPhone ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">电话</label>
                  <input name="电话" type="tel" placeholder="手机号码" className={inputCls} />
                </div>
              ) : null}
              {showMessage ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">留言</label>
                  <textarea name="留言" rows={4} placeholder="想对我们说点什么…" className={inputCls} />
                </div>
              ) : null}
              {state === "error" ? (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  提交失败,请稍后重试。
                </div>
              ) : null}
              <button
                type="submit"
                disabled={state === "sending"}
                className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {state === "sending" ? "提交中…" : submitText}
              </button>
              {isCanvas ? (
                <p className="text-center text-xs text-slate-400">编辑器内不会真实提交,发布后生效</p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default ContactForm;
