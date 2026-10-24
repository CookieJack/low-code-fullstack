import type { NodeSchema, PageSchema } from "@lc/schema";

const id = () => `n${Math.random().toString(36).slice(2, 10)}`;

/**
 * 模板实例化:深拷贝模板 schema 并为全部节点重新生成 id
 * (与前端 tree.ts 的 cloneWithNewIds 同语义),title 换成新页面名。
 * navbar/footer 节点原样保留:全局区块在读取路径按站点配置覆盖。
 */
export function instantiateTemplateSchema(template: PageSchema, title: string): PageSchema {
  const regen = (node: NodeSchema): NodeSchema => {
    const copy: NodeSchema = { ...node, id: id() };
    if (copy.children?.length) copy.children = copy.children.map(regen);
    return copy;
  };
  return { version: 1, title, nodes: template.nodes.map(regen) };
}

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

/** 活动报名页模板:营销场景快速起步 */
export function eventTemplate(title: string): PageSchema {
  return {
    version: 1,
    title,
    nodes: [
      {
        id: id(),
        type: "navbar",
        props: {
          brand: "城市开发者大会",
          logoUrl: "",
          links: [
            { label: "亮点", href: "#highlights" },
            { label: "议程", href: "#agenda" },
            { label: "报名", href: "#signup" },
          ],
          ctaText: "立即报名",
          ctaHref: "#signup",
        },
      },
      {
        id: id(),
        type: "hero",
        props: {
          title: "2026 城市开发者大会",
          subtitle: "一天时间,看懂低代码与 AI 的下一次交汇。10 位一线实践者,4 场深度工作坊,等你来。",
          align: "center",
          bgColor: "#0f172a",
          bgImage: "",
          height: "tall",
          buttonText: "立即报名",
          buttonHref: "#signup",
          secondaryText: "查看亮点",
          secondaryHref: "#highlights",
        },
      },
      {
        id: id(),
        type: "features",
        props: {
          title: "大会亮点",
          subtitle: "不讲概念,只讲落地的经验与教训。",
          columns: "3",
          items: [
            { icon: "🎤", title: "一线实践分享", desc: "来自制造、零售、金融的行业案例,可直接复用的落地方案。" },
            { icon: "🛠️", title: "动手工作坊", desc: "从零搭建一个完整业务应用,现场带走属于你的第一个低代码应用。" },
            { icon: "🤝", title: "闭门交流", desc: "与讲师和同行面对面,聊聊你正在踩的坑与解题思路。" },
          ],
        },
      },
      {
        id: id(),
        type: "cta",
        props: {
          title: "席位有限,报名从速",
          subtitle: "早鸟票限时免费,报名成功后将收到确认短信与参会指南。",
          buttonText: "立即报名",
          buttonHref: "#signup",
          bgColor: "#7c3aed",
        },
      },
      {
        id: id(),
        type: "contact-form",
        props: {
          title: "报名登记",
          subtitle: "填写以下信息即可完成报名,我们会通过短信与邮件通知你。",
          showName: true,
          showEmail: true,
          showPhone: true,
          showMessage: false,
          submitText: "提交报名",
          successText: "报名成功!参会指南将发送至你的邮箱。",
        },
      },
      {
        id: id(),
        type: "footer",
        props: {
          brand: "城市开发者大会",
          tagline: "让每一次相聚都产生价值。",
          links: [
            { label: "大会亮点", href: "#highlights" },
            { label: "报名", href: "#signup" },
            { label: "联系我们", href: "#signup" },
          ],
          copyright: "© 2026 城市开发者大会组委会",
        },
      },
    ],
  };
}
