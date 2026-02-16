# 贡献指南（CONTRIBUTING）

感谢你愿意参与 StarNode。

本项目当前阶段的目标非常明确：
**优先保证正确性、可维护性、可解释性，再扩展功能边界。**

---

## 1. 开发环境准备

### 必须条件

- Node.js `22.x`
- npm（随 Node 22）

### 本地安装

```bash
npm ci
```

---

## 2. 开发流程（推荐）

1. 从最新主分支创建功能分支
2. 完成开发并补充/更新测试
3. 本地执行质量门禁
4. 提交 PR（说明背景、方案、验证结果）

```bash
npm run ci:verify
```

---

## 3. 提交前检查清单

- [ ] 功能是否符合当前阶段目标（MVP 优先）
- [ ] 是否引入了不必要复杂度（过度抽象/过早优化）
- [ ] 是否补充了对应测试（或说明无法覆盖原因）
- [ ] 是否更新了相关文档
- [ ] `npm run ci:verify` 是否通过

---

## 4. 代码约定

### 4.1 分层边界

- `packages/core`：纯领域逻辑，不依赖 UI
- `packages/renderer`：只负责可视化
- `packages/storage`：只负责读写、迁移与同步
- `apps/web`：负责交互与装配

### 4.2 风格原则

- 小函数、单一职责
- 优先消除特殊分支，而不是堆 if/else
- 命名先可读，再“聪明”
- 任何“看起来能跑但解释不清”的实现，默认不通过

---

## 5. 测试与验证

### 常用命令

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npm run ci:verify
```

### 生产 smoke

```bash
npm run smoke:prod:web
```

该命令会在生产构建后启动服务，并检测 `/api/health` 与关键安全响应头。

---

## 6. PR 描述模板（建议）

可直接复制以下模板：

```md
## 背景
- 这个问题/需求是什么
- 为什么现在做

## 方案
- 核心改动点
- 为什么采用这条路径

## 影响范围
- apps/web:
- packages/core:
- packages/renderer:
- packages/storage:

## 验证
- [ ] npm run lint
- [ ] npm run test
- [ ] npm run typecheck
- [ ] npm run build
- [ ] npm run smoke:prod:web（如涉及发布链路）

## 风险与回滚
- 主要风险：
- 回滚策略：
```

---

## 7. 讨论与反馈

如果你想做较大改动（模块重组、状态模型变更、持久化协议调整），建议先提 Issue 讨论设计边界，再提交实现。

谢谢你帮助 StarNode 变得更好。
