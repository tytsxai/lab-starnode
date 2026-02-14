# AGENTS.md

## 项目骨架总览

```txt
.
├─ 01_项目愿景.md
├─ 02_产品需求文档.md
├─ 03_技术架构.md
├─ 04_商业策略.md
├─ 05_开发路线图.md
├─ 06_生产发布检查清单.md
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
│     │  ├─ UniverseScene.tsx
│     │  ├─ UniversePanel.tsx
│     │  └─ universe/
│     │     ├─ NoteListOverlay.tsx
│     │     ├─ types.ts
│     │     ├─ useBatchActions.ts
│     │     ├─ useBatchActions.test.ts
│     │     └─ useNoteFilterState.ts
│     ├─ lib/
│     │  ├─ batchHelpers.ts
│     │  ├─ batchHelpers.test.ts
│     │  ├─ noteStore/
│     │  │  ├─ createNoteStore.ts
│     │  │  ├─ noteCommands.ts
│     │  │  ├─ seedNotes.ts
│     │  │  ├─ storageAdapter.ts
│     │  │  └─ types.ts
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
      └─ src/
         ├─ index.ts
         └─ index.test.ts
```

## 文件职责（一句话版）
- `01_项目愿景.md`：定义 StarNode 的长期方向与产品哲学。
- `02_产品需求文档.md`：定义功能范围、验收标准与里程碑。
- `03_技术架构.md`：定义分层架构、数据模型与技术决策。
- `04_商业策略.md`：定义增长飞轮与收入模型。
- `05_开发路线图.md`：定义阶段执行计划与 DoD。
- `06_生产发布检查清单.md`：定义上线前后质量门禁、回滚与观察项。
- `apps/web/app/page.tsx`：MVP 入口页面（编辑 + 宇宙视图）。
- `apps/web/components/EditorPanel.tsx`：编辑器面板（输入校验、关键词预览、编辑/新建切换）。
- `apps/web/components/LinkPanel.tsx`：关联解释列表（标签证据/关键词证据/分数构成 + 模式筛选）。
- `apps/web/components/UniverseScene.tsx`：3D 宇宙视图渲染入口，负责星球选择联动。
- `apps/web/components/UniversePanel.tsx`：右侧 HUD 交互面板（筛选/标签/批量操作/撤销/编辑跳转）。
- `apps/web/components/universe/useNoteFilterState.ts`：统一管理筛选查询状态（搜索、标签、可见性）。
- `apps/web/components/universe/useBatchActions.ts`：封装批量迁移/冰封/删除动作与反馈文案。
- `apps/web/components/universe/useBatchActions.test.ts`：批量删除确认文案与实际变更一致性测试。
- `apps/web/components/universe/NoteListOverlay.tsx`：笔记列表纯渲染层（选择、编辑入口、单条冻结/删除）。
- `apps/web/components/universe/types.ts`：Universe 面板查询与列表渲染类型定义。
- `apps/web/lib/noteForm.ts`：编辑输入校验与关键词预览纯函数。
- `apps/web/lib/batchHelpers.ts`：批量操作计数与映射纯函数（可单测复用）。
- `apps/web/lib/batchHelpers.test.ts`：批量计数函数单测。
- `apps/web/lib/noteStore/types.ts`：store 领域状态与输入 DTO 定义。
- `apps/web/lib/noteStore/storageAdapter.ts`：store I/O 适配层（load/save 注入点）。
- `apps/web/lib/noteStore/seedNotes.ts`：本地首次启动种子数据。
- `apps/web/lib/noteStore/noteCommands.ts`：store 纯命令层（无 Zustand、无 I/O）。
- `apps/web/lib/noteStore/createNoteStore.ts`：zustand 装配工厂（依赖注入 + 副作用落盘）。
- `apps/web/lib/useNoteStore.ts`：默认浏览器环境 store 实例导出入口。
- `apps/web/lib/useNoteStore.test.ts`：store 命令关键路径测试（no-op、undo、编辑态恢复、计数准确性）。
- `apps/web/.eslintrc.json`：固定 Next.js ESLint 规则，保证 `next lint` 非交互可执行。
- `packages/core/src/index.ts`：领域模型、关键词提取、混合关联评分与可解释证据输出（默认仅统计活跃笔记）。
- `packages/core/src/index.test.ts`：核心规则测试（去噪、混合评分、冻结过滤、排序稳定性）。
- `packages/renderer/src/index.tsx`：3D 宇宙渲染组件（支持连线与星球点击选中）。
- `packages/storage/src/index.ts`：本地持久化（schemaVersion + 迁移管线 + 节流写入 + 跨标签页变更订阅 + 脏数据兜底归一化）。
- `packages/storage/src/index.test.ts`：storage 迁移、节流写入与跨标签页订阅回归测试（v1/v2 到 v3 的兼容验证）。
- `.nvmrc`：统一 Node LTS 版本，降低 TypeScript 编译器异常风险。
- `scripts/check-node-version.mjs`：Node 主版本门禁，阻断非 Node 22 环境下的开发/构建/类型检查。
- `tsconfig.base.json`：monorepo 共享 TypeScript 基础配置（采用 workspace 包解析，避免 path alias 导致的编译器异常）。

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
5. `apps/web/lib/noteStore/noteCommands.ts` 只能包含纯状态变换，不允许直接访问存储或浏览器 API。
6. `apps/web/components/universe/*` 只负责面板状态与渲染，不直接耦合持久化实现细节。

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
- 2026-02-14：storage 增加 schemaVersion 迁移管线与节流保存；CI workflow 已在本地提交，待 `workflow` scope 权限后推送远端。
- 2026-02-14：修复 storage 读时迁移未回写的逻辑漏洞，并新增迁移/节流测试覆盖。
- 2026-02-14：完成 UniversePanel 分层拆分（query state / batch actions / list render），并将 useNoteStore 重构为 commands + adapter + factory 注入架构，新增 6 条 store 关键行为测试。
- 2026-02-14：新增 `ci:verify` 一键质量门禁脚本与生产发布检查清单文档；CI workflow 文件已在本地生成，待 `workflow` scope 权限后推送远端。
- 2026-02-14：移除 `tsconfig.base.json` 中跨包 `paths` 映射，改为 workspace 包解析以修复 `tsc --noEmit` Debug Failure；根构建脚本改为 `--if-present` 以匹配多包实际脚本覆盖。
- 2026-02-15：完成首轮工程审计修复：宇宙统计口径统一为“仅活跃笔记”、批量删除提示改为按可删除数确认并按实际删除数反馈、编辑目标丢失时主动清理表单脏状态、storage 新增 `pagehide/beforeunload` 节流落盘兜底，并补齐回归测试。
- 2026-02-15：完成稳定性增强：新增 storage 跨标签页 `storage` 事件订阅能力，store 在外部变更时自动同步 notes 并清理失效编辑态/撤销快照，补齐多标签页一致性回归测试。
- 2026-02-15：补强 storage 订阅边界测试（外部删除 key、非法 payload），确保异常输入不污染当前会话状态。
- 2026-02-15：完成收尾治理：storage 对非法 `planetId/updatedAt` 增加归一化兜底，避免“隐形笔记”与排序不稳定；补齐对应回归测试并补充关键注释，降低新人维护认知成本。
- 2026-02-15：在根包声明 `engines.node=22.x`，收敛本地运行时漂移风险；GitHub Actions workflow 受 `workflow` scope 限制，待授权后推送。
- 2026-02-15：补齐 storage 跨标签页 `localStorage.clear()` 同步边界（`StorageEvent.key === null`），确保外部清空数据时当前会话可正确回收为无笔记状态。
