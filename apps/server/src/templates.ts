import type { PageSchema } from "@lc/schema";

const id = () => `n${Math.random().toString(36).slice(2, 10)}`;

/** 官网落地页模板:新页面可一键套用 */
export function landingTemplate(title: string): PageSchema {
  return {
    version: 1,
    title,
    nodes: [
      {
        id: id(),
        type: "navbar",
        props: {
          brand: "星辰科技",
          logoUrl: "",
          links: [
            { label: "首页", href: "#" },
            { label: "产品", href: "#" },
            { label: "解决方案", href: "#" },
            { label: "关于我们", href: "#" },
          ],
          ctaText: "免费试用",
          ctaHref: "#contact",
        },
      },
      {
        id: id(),
        type: "hero",
        props: {
          title: "让数字化触手可及",
          subtitle: "从官网到业务系统,星辰科技为 1000+ 企业提供一站式数字化解决方案,助力业务快速增长。",
          align: "center",
          bgColor: "#111827",
          bgImage: "",
          height: "tall",
          buttonText: "免费试用",
          buttonHref: "#contact",
          secondaryText: "了解产品",
          secondaryHref: "#features",
        },
      },
      {
        id: id(),
        type: "features",
        props: {
          title: "为什么选择星辰",
          subtitle: "从产品到服务,我们为每一个细节投入心血。",
          columns: "3",
          items: [
            { icon: "⚡", title: "极速交付", desc: "标准化实施流程,两周内即可上线运行。" },
            { icon: "🔒", title: "安全合规", desc: "通过 ISO27001 认证,数据加密多重备份。" },
            { icon: "💬", title: "专属服务", desc: "7×24 小时技术支持,专属客户成功团队。" },
          ],
        },
      },
      {
        id: id(),
        type: "image-text",
        props: {
          title: "一站式数字化平台",
          desc: "集官网、小程序、CRM 于一体,打通全渠道客户数据,让每一次营销都有的放矢。",
          imageUrl: "",
          imageSide: "left",
          buttonText: "查看方案",
          buttonHref: "#",
        },
      },
      {
        id: id(),
        type: "cta",
        props: {
          title: "准备好开始了吗?",
          subtitle: "立即注册,免费体验完整功能,无需绑定信用卡。",
          buttonText: "免费注册",
          buttonHref: "#contact",
          bgColor: "#4f46e5",
        },
      },
      {
        id: id(),
        type: "contact-form",
        props: {
          title: "联系我们",
          subtitle: "留下你的信息,产品顾问将在 1 个工作日内与你联系。",
          showName: true,
          showEmail: true,
          showPhone: true,
          showMessage: true,
          submitText: "预约演示",
          successText: "提交成功,我们会尽快与你联系!",
        },
      },
      {
        id: id(),
        type: "footer",
        props: {
          brand: "星辰科技",
          tagline: "让数字化触手可及。",
          links: [
            { label: "产品", href: "#" },
            { label: "解决方案", href: "#" },
            { label: "加入我们", href: "#" },
            { label: "联系方式", href: "#contact" },
          ],
          copyright: "© 2026 星辰科技 Xingchen Tech. 保留所有权利.",
        },
      },
    ],
  };
}
