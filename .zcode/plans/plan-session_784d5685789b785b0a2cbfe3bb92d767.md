# 低代码后台:物料扩充 + 左栏改造 + 右栏样式 Tab 化

中间画布不改。所有新样式/新物料经现有 renderer 链路,发布页与导出自动生效。

## 一、新增 14 个物料组件(纯增量)

位置:`packages/materials/src/blocks/`,遵循现有模式(组件 tsx + def,复用 `sectionStyle`),在 `packages/materials/src/index.ts` 注册:

| 分类 | 新物料 |
|---|---|
| 内容(新分类) | testimonials 用户评价、team 团队介绍、timeline 时间线、steps 步骤流程、stats 统计数字、logo-wall 合作伙伴 Logo 墙 |
| 基础 | button 按钮(文字/链接/样式/尺寸)、divider 分隔线(样式/粗细/颜色)、announcement 公告条(文字/链接)、spacer 间距占位(高度) |
| 布局 | tabs 标签页容器(container,子区块按序变页签,客户端切换;编辑模式可切页签编辑)、accordion 折叠面板(container,每个子区块为一个可折叠条目,标题取区块名) |
| 营销 | subscribe 邮箱订阅表单(复用现有 /api/forms 提交链路) |
| 媒体 | map 地图(iframe 嵌入地址 + 高度) |

物料拖拽/点击添加走现有 dnd 通道,画布零改动。左栏分组按 category 自动生成,新分类无需额外配置。

## 二、通用样式能力扩展(右栏 Tab 的基础)

1. `packages/schema/src/index.ts`:`nodeStyleSchema`(strict)与 `NodeStyle` 接口新增全部 optional 字段(旧数据兼容):
   - 字体:`fontFamily`、`fontSize`("16px")、`fontWeight`、`color`(文字色)、`textAlign`、`lineHeight`("1.5")
   - 边框:`borderWidth`、`borderStyle`、`borderColor`、`borderRadius`(均带单位字符串)
   - 间距:`paddingLeft`、`paddingRight`
2. `packages/materials/src/lib/style.ts` 的 `sectionStyle()`:消费上述字段(borderWidth>0 时默认 solid + 中性色 borderColor)。全部 14+14 个物料经此合并样式,画布/发布页/导出一处生效。

## 三、右侧属性面板 Tab 化

1. `packages/ui`:新增 Tabs 组件(shadcn 模板,新增依赖 `@radix-ui/react-tabs`)。
2. `apps/web/src/components/editor/property-panel.tsx` 重构为 5 个 tab:
   - **内容**:现 propSchema 平铺(逻辑不变;为空时显示占位说明)
   - **字体**:字体族 Select、字号 number、字重 Select、文字颜色 ColorField、对齐三段切换、行高 number
   - **边框**:宽度 Slider(0–16px)、样式 Select(实线/虚线/点线)、颜色 ColorField、圆角 Slider(0–48px)
   - **背景**:背景色(现 ColorField,key 不变)
   - **间距**:上/下内边距(现 Slider)+ 左/右内边距 Slider
   - 重置按钮移到面板头部(清空整个 style);未选中节点时"页面设置"不变。

## 四、左侧物料面板改造

仅改 `apps/web/src/components/editor/material-panel.tsx`:
- 新增头部:搜索框(Input + Search 图标 + 清空,按标题/描述/分类过滤,无结果显示空态)+ 视图切换按钮(列表 ↔ 网格)
- 可折叠分组:分类标题显示数量徽章,点击折叠/展开,默认全展开
- 网格视图:两列小卡片(icon 上、名称下);列表视图保持现状
- 视图模式、折叠状态存 localStorage;MaterialItem 拖拽与点击添加逻辑不动;底部页面大纲不动

## 五、验证

1. `pnpm -r build` + lint 通过
2. 手动冒烟(遵守"只动自建测试数据"约定):新建测试页 → 拖入新物料 → 五个 tab 改样式 → 画布与发布页均生效 → 撤销/自动保存正常

实施顺序:①物料 → ②样式扩展 → ③Tabs 组件 → ④属性面板 → ⑤左栏 → ⑥构建+冒烟。