# 主题系统升级:跟随系统 + 登录页切换按钮 + 全灰色模式

## 现状结论(已探明)
- 主题状态层已支持三态 `light | dark | system`(`theme-provider.tsx`,localStorage `lc-theme`,已监听系统偏好变化,防闪烁脚本也已处理 system)——**缺的只是 UI**:切换按钮是二态取反,没有"跟随系统"入口。
- 登录页在根布局 ThemeProvider 内,可直接复用 `ThemeToggle`。
- `@lc/ui` 已有 DropdownMenu 组件(UserMenu 在用),无需新写。
- 灰色模式无任何现成基础设施,需新建;采用 **CSS 变量级灰度**(不用 `filter: grayscale`——它挂在 html 上会破坏 Radix 下拉菜单/弹层的 fixed 定位)。

## 变更方案(5 个文件)

### 1. 三态切换 — 重写 `apps/web/src/components/theme/theme-toggle.tsx`
改为 DropdownMenu(复用 UserMenu 同款组件):
- 触发按钮仍是 ghost icon;图标逻辑:`theme === "system"` 显示 Monitor,否则 `resolved === "dark" ? Sun : Moon`。
- 菜单三项:**亮色 / 暗色 / 跟随系统**(各配图标,当前选中项打勾)。
- provider 的 `setTheme("system")` 开箱即用,`theme-provider.tsx` 状态层基本不动。

### 2. 全灰色模式(独立开关,与亮/暗叠加;全站生效)
- **`theme-provider.tsx`**:新增 `ColorMode = "color" | "grayscale"`,localStorage key `lc-color-mode`(默认 color);context 增加 `grayscale: boolean` + `setGrayscale()`,应用方式为切换 `<html>` 上的 `grayscale` class。
- **`app/layout.tsx`**:扩展内联防闪烁脚本,hydration 前同步恢复 `grayscale` class(与现有 `lc-theme` 逻辑并列)。
- **`theme-toggle.tsx`**:菜单底部加 Separator + **"全灰色模式"** 勾选项(可叠加当前亮/暗)。
- **`app/globals.css`** 新增灰度块:
  - `html.grayscale`(亮色灰值)与 `html.dark.grayscale`(暗色灰值):覆盖 `--primary / --accent / --ring / --brand-from / --brand-to` 等语义变量为 zinc 灰系。
  - 品牌调色板 `--color-indigo/violet/fuchsia-*` 是根布局 inline style 注入的,需在 `html.grayscale` 下用 `!important` 覆盖为对应明度的灰值(33 个变量,一次写死,不随站点换肤变色)→ 发布页物料同步变灰(仅本机生效,访客不受影响;静态导出 HTML 保持原色)。
  - 散落的直接彩色类(登录页氛围光 `bg-indigo-500/15`、状态点缀 `text-emerald-500`/`text-red-500`/`text-amber-600` 等,约 20 种、集中在少数文件):在灰度块写针对性覆盖规则(选择器 `html.grayscale .bg-red-500\/10` 优先级必胜),保证真正的"全灰"。
  - `html.grayscale .theme-scope` 一并灰化(设置页换肤预览卡)。
  - 灰度块加注释:新增组件若直接用彩色类,需同步补覆盖。

### 3. 登录页加切换按钮 — `apps/web/app/dashboard/login/page.tsx`
根容器内、装饰背景层之后、Card 平级处加绝对定位按钮:`<div className="absolute right-6 top-6 z-10"><ThemeToggle /></div>`,与 dashboard/编辑器"右上角第一个按钮"的习惯一致。

## 不做的事
- 不动设置页(那是站点品牌色,站点级配置;灰度是个人偏好,入口在主题下拉里)。
- 不动静态导出(内容快照,不带个人偏好)。
- `theme-provider.tsx` 的三态逻辑、`themeInitScript` 的 system 处理保持原语义,只增不改。

## 验证
1. `pnpm build` 编译通过。
2. 启动 dev(docker 依赖:postgres 实际 5432 / redis 6379),浏览器逐项检查:三态切换及持久化、切到"跟随系统"后改系统外观实时跟随、灰度分别叠加亮/暗、登录页按钮、刷新无闪烁、发布页在本机灰度下观感。
3. 纯前端 UI 改动,不触碰业务数据。