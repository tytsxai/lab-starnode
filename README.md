# StarNode（星诺）

> 让记录知识，变成亲眼看见思想演化的过程。

[![Release](https://img.shields.io/github/v/release/tytsxai/lab-starnode)](https://github.com/tytsxai/lab-starnode/releases) · [llms.txt](llms.txt) · [Issues](https://github.com/tytsxai/lab-starnode/issues) · [Roadmap](05_开发路线图.md)

> **关键词**：3D 笔记可视化 · 知识图谱可视化 · 本地优先笔记 · 可解释笔记关联 · 个人知识管理 · PKM · second brain 3D · Obsidian Graph 替代 · Roam 替代 · Logseq 替代 · 浏览器原生 PKM
>
> **Keywords**: 3D knowledge graph notes · knowledge universe app · local-first note-taking · explainable note linking · Obsidian Graph alternative · Roam alternative · Logseq alternative · browser-based PKM · second brain visualization

StarNode 是一个 **本地优先（Local-first）** 的知识管理实验项目：
你写下的每条笔记都会成为“宇宙中的一个知识粒子”，按星球聚合、按语义引力连接、按时间持续演化。

如果你厌倦了「写了很多、回头找不到、知识结构看不见」的笔记体验，这个项目是为你准备的。

**English summary**: StarNode is a local-first, browser-based personal knowledge manager that renders your notes as a 3D "knowledge universe" — clusters become planets, semantic similarity becomes visible gravity. Every inferred link is **explainable**: drill into any connection to see exactly which tag, keyword, or similarity score triggered it. No cloud, no signup, no AI black box. Designed for people who feel "I write a lot but I can never find anything and the structure is invisible." Stack: Next.js + TypeScript, npm-workspaces monorepo.

---

## ✨ 项目亮点

- **写作优先**：先保证输入与编辑体验，再谈炫酷可视化。
- **本地优先**：默认浏览器本地存储，断网可读写。
- **可解释关联**：不仅告诉你“这两条笔记有关”，还会展示触发证据（标签/关键词/评分）。
- **3D 宇宙视图**：以空间化方式探索自己的知识版图。
- **工程化质量门禁**：lint / test / typecheck / build 一键验证。

---

## 🧱 当前能力（MVP）

- 笔记创建、编辑、删除、撤销
- 星球分类管理（含批量迁移）
- 冰封/解冻机制（可控制是否纳入统计与关联）
- 标签与关键词关联线
- 证据可解释关联面板
- 本地持久化 + 基础迁移 + 跨标签页同步
- 健康探针接口：`/api/health`

---

## 🏗️ 仓库结构（Monorepo）

```txt
.
├─ apps/
│  └─ web/                 # Next.js 应用壳层（交互与页面）
├─ packages/
│  ├─ core/                # 领域模型与关联算法（纯逻辑）
│  ├─ renderer/            # 3D 渲染组件
│  └─ storage/             # 本地持久化与迁移
├─ docs/
│  └─ 生产运维手册.md       # 发布、回滚、观测、备份恢复
├─ scripts/
│  ├─ check-build-safety.mjs
│  ├─ check-node-version.mjs
│  └─ smoke-prod-web.mjs
└─ package.json
```

### 模块依赖关系

```txt
apps/web
  -> @starnode/core
  -> @starnode/renderer
  -> @starnode/storage
```

---

## 🚀 快速开始

### 1) 环境要求

- Node.js: `22.x`
- npm: 建议使用 Node 22 自带 npm（避免版本漂移）

> 项目包含 Node 版本门禁；并在 CI/托管构建启用 `Build Safety Gate`，禁止 `STARNODE_ALLOW_UNSAFE_BUILD=1` 进入发布链路。

### 2) 安装依赖

```bash
npm ci
```

### 3) 启动开发环境

```bash
npm run dev
```

打开浏览器访问：

- `http://localhost:3000`

### 4) 运行质量门禁

```bash
npm run ci:verify
```

该命令会依次执行：

- `lint`
- `test`
- `typecheck`
- `build`

---

## 🧪 常用命令

```bash
# 根仓库
npm run dev              # 启动 web 开发环境
npm run build            # 构建所有 workspace
npm run lint             # 运行 lint
npm run test             # 运行测试
npm run typecheck        # 运行类型检查
npm run ci:verify        # 一键质量门禁

# 生产 smoke（先 build 再启动并探测健康接口与安全头）
npm run smoke:prod:web
```

---

## 🔍 健康检查与发布前验证

- 健康探针：`GET /api/health`（`HEAD` 同样可用）
- 预期返回：HTTP 200，`{ status: "ok", ... }`

建议在发布前执行：

```bash
npm ci
npm run ci:verify
npm run smoke:prod:web
npm audit --omit=dev
```

更多生产流程见：[`docs/生产运维手册.md`](./docs/生产运维手册.md)

---

## 💾 数据与隐私说明

当前版本为本地优先，核心数据存储于浏览器 `localStorage`。

- 默认 key：`starnode:notes`
- 适合个人知识宇宙场景
- 若清理浏览器本地数据，未备份内容会丢失

备份与恢复流程见：[`docs/生产运维手册.md`](./docs/生产运维手册.md)

---

## 🗺️ 文档导航

- [`01_项目愿景.md`](./01_项目愿景.md)
- [`02_产品需求文档.md`](./02_产品需求文档.md)
- [`03_技术架构.md`](./03_技术架构.md)
- [`04_商业策略.md`](./04_商业策略.md)
- [`05_开发路线图.md`](./05_开发路线图.md)
- [`06_生产发布检查清单.md`](./06_生产发布检查清单.md)
- [`docs/生产运维手册.md`](./docs/生产运维手册.md)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md)

---

## 🤝 参与贡献

欢迎 Issue / PR。建议先阅读 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

---

## ❓ FAQ

**Q：笔记存在哪里?清浏览器数据会不会丢?**
存在浏览器 `localStorage`,key 是 `starnode:notes`。清浏览器数据**确实会丢**。备份恢复看 [生产运维手册](./docs/生产运维手册.md)。

**Q：能不能多端同步?**
现阶段不能。同步在路线图里,但**故意排在「本地体验做好」后面**,先稳后扩。

**Q：和 Obsidian Graph、Roam、Logseq 有什么区别?**
- Obsidian Graph 是 2D + 显式 `[[wikilink]]`,你不写 link 就没有线
- StarNode 是 3D + **推断关联**(标签 / 关键词 / 语义评分),不用你手动连线
- 而且每条 link 都能展开看「为什么连」—— 是哪个标签 / 关键词 / 分数触发的(explainable linking)

**Q：3D 不就是装饰吗?**
3D 是检索 UI 本身,不是装饰。相关笔记空间上更近、聚成星球;**位置本身有信息**。

**Q：要不要联网?**
首次加载之后完全本地运行,断网可读写。

**Q：怎么开始?**
Node.js 22.x + `npm ci` + `npm run dev`,浏览器开 `http://localhost:3000`。

## 📌 项目状态

当前仓库聚焦于 **MVP 与工程质量稳定性**：
先把"可用、可解释、可维护"打牢，再推进更大规模的 AI 与协作能力。
