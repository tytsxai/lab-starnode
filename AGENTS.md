# AGENTS.md

## 项目骨架总览

```txt
.
├─ .github/
│  └─ workflows/
│     └─ ci.yml
├─ 01_项目愿景.md
├─ 02_产品需求文档.md
├─ 03_技术架构.md
├─ 04_商业策略.md
├─ 05_开发路线图.md
├─ AGENTS.md
├─ .nvmrc
├─ package.json
├─ scripts/
│  └─ check-node-version.mjs
├─ tsconfig.base.json
├─ apps/
│  └─ web/
│     ├─ app/
│     │  ├─ globals.css
│     │  ├─ layout.tsx
│     │  └─ page.tsx
│     ├─ components/
│     │  ├─ EditorPanel.tsx
│     │  ├─ LinkPanel.tsx
│     │  └─ UniversePanel.tsx
│     ├─ lib/
│     │  ├─ batchHelpers.ts
│     │  ├─ batchHelpers.test.ts
│     │  ├─ noteForm.ts
│     │  ├─ useNoteStore.ts
│     │  └─ useNoteStore.test.ts
│     ├─ .eslintrc.json
│     ├─ next.config.mjs
│     ├─ next-env.d.ts
│     ├─ package.json
│     └─ tsconfig.json
└─ packages/
   ├─ core/
   │  ├─ src/index.ts
   │  └─ src/index.test.ts
   ├─ renderer/
   │  └─ src/index.tsx
   └─ storage/
      └─ src/index.ts
```

## 文件职责（一句话版）
- `01_项目愿景.md`：定义 StarNode 的长期方向与产品哲学。
- `02_产品需求文档.md`：定义功能范围、验收标准与里程碑。
- `03_技术架构.md`：定义分层架构、数据模型与技术决策。
- `04_商业策略.md`：定义增长飞轮与收入模型。
- `05_开发路线图.md`：定义阶段执行计划与 DoD。
- `.github/workflows/ci.yml`：CI 门禁（Node 22 + lint + test + typecheck + build）。
- `apps/web/app/page.tsx`：MVP 入口页面（编辑 + 宇宙视图）。
- `apps/web/components/EditorPanel.tsx`：编辑器面板（输入校验、关键词预览、编辑/新建切换）。
- `apps/web/components/LinkPanel.tsx`：关联解释列表（标签证据/关键词证据/分数构成 + 模式筛选）。
- `apps/web/components/UniversePanel.tsx`：3D 宇宙视图、关联过滤、证据回填搜索、笔记筛选与批量操作入口。
- `apps/web/lib/noteForm.ts`：编辑输入校验与关键词预览纯函数。
- `apps/web/lib/batchHelpers.ts`：批量操作计数与映射纯函数（可单测复用）。
- `apps/web/lib/batchHelpers.test.ts`：批量计数函数单测。
- `apps/web/lib/useNoteStore.ts`：统一管理笔记状态（新增/更新/删除/批量迁移/批量删除/冰封解冻/编辑态/一次撤销快照）。
- `apps/web/lib/useNoteStore.test.ts`：store 批量计数与 undo 快照恢复单测。
- `apps/web/.eslintrc.json`：固定 Next.js ESLint 规则，保证 `next lint` 非交互可执行。
- `packages/core/src/index.ts`：领域模型、关键词提取、混合关联评分与可解释证据输出（默认仅统计活跃笔记）。
- `packages/core/src/index.test.ts`：核心规则测试（去噪、混合评分、冻结过滤、排序稳定性）。
- `packages/renderer/src/index.tsx`：3D 宇宙渲染组件（支持连线与星球点击选中）。
- `packages/storage/src/index.ts`：本地持久化（schemaVersion + 迁移管线 + 节流写入）。
- `.nvmrc`：统一 Node LTS 版本，降低 TypeScript 编译器异常风险。
- `scripts/check-node-version.mjs`：Node 主版本门禁，阻断非 Node 22 环境下的开发/构建/类型检查。

## 模块边界与依赖

```txt
apps/web
  -> @starnode/core      (读取领域模型、关键词与关联评分)
  -> @starnode/renderer  (展示 3D 视图)
  -> @starnode/storage   (本地持久化)
  -> zustand             (前端状态管理)

@starnode/renderer
  -> @starnode/core      (消费 PlanetViewModel / PlanetLink)

@starnode/storage
  -> @starnode/core      (消费 Note 类型)
```

### 边界原则
1. `core` 只放纯逻辑，不依赖 UI。
2. `renderer` 只负责可视化，不写业务规则。
3. `storage` 只负责读写与迁移，不推导业务状态。
4. `apps/web` 负责组装与交互流程。

## 关键架构决策
1. 先做 **本地优先 + 单人宇宙**，保证闭环体验。
2. 关联计算维持在 `core`，UI 仅消费可解释 view model。
3. 采用 **monorepo**，提前隔离核心逻辑与 UI，降低后续重构成本。
4. 节流写入 + schema 迁移，优先保证可持续演进而非一次性实现。

## 变更日志
- 2026-02-14：完成 v2 文档重构（愿景/PRD/架构/商业/路线图）。
- 2026-02-14：初始化 monorepo 工程骨架（apps + packages）。
- 2026-02-14：落地首版 MVP 页面，打通“写入笔记 -> 星球变化 -> 本地持久化”主链。
- 2026-02-14：完成页面模块拆分与 Zustand 状态收敛，新增笔记删除闭环。
- 2026-02-14：新增标签输入、可解释星际关联线、3D 星球点击联动。
- 2026-02-14：统一星球配置源，新增关联显示筛选开关与快捷键提交能力。
- 2026-02-14：拆分 LinkPanel，支持空态星球可见，并新增 `.nvmrc`（Node 22）用于恢复类型门禁。
- 2026-02-14：打通笔记编辑链路（列表选中进入编辑 -> 保存更新），并增强关联双向跳转。
- 2026-02-14：新增编辑表单校验、笔记搜索/排序能力，提升高密度笔记可操作性。
- 2026-02-14：新增标签 chips 过滤与批量操作（批量迁移/批量删除）。
- 2026-02-14：新增批量删除二次确认与一次性撤销（Undo）能力。
- 2026-02-14：新增“全选过滤结果/清空选择/重置过滤”快捷操作与轻量 Toast 反馈。
- 2026-02-14：新增 Node 22 版本门禁脚本，修复非 LTS 下 TypeScript `Debug Failure` 风险。
- 2026-02-14：补充 `apps/web/.eslintrc.json`，使 lint 流程改为可自动执行的非交互模式。
- 2026-02-14：新增笔记冰封/解冻机制（单条 + 批量 + 视图切换），并使星球统计/关联默认仅计算活跃笔记。
- 2026-02-14：补齐 core 领域测试并优化批量操作计数逻辑，消除“提示数量与实际变更不一致”的前端体验偏差。
- 2026-02-14：新增关键词关联算法与可解释评分结构（标签证据 + 关键词证据 + 分数拆解）。
- 2026-02-14：关联面板支持“仅标签/仅关键词/混合”筛选与证据词回填搜索。
- 2026-02-14：抽离表单校验与批量计数 helper，并补齐 web/store 关键单测。
- 2026-02-14：storage 增加 schemaVersion 迁移管线与节流保存，新增 CI 工作流（Node 22 全门禁）。
