#!/usr/bin/env node

// ==================== Node 版本门禁 ====================
// 目标：统一团队本地与 CI 的 Node 主版本，避免 TS 在非 LTS 版本下出现异常

const requiredMajor = 22
const currentVersion = process.versions.node
const currentMajor = Number.parseInt(currentVersion.split('.')[0], 10)

if (Number.isNaN(currentMajor)) {
  console.error(`[Node Gate] 无法解析当前 Node 版本：${currentVersion}`)
  process.exit(1)
}

if (currentMajor !== requiredMajor) {
  console.error(
    `[Node Gate] 当前 Node=${currentVersion}，项目要求 Node ${requiredMajor}.x（见 .nvmrc）。`,
  )
  console.error('[Node Gate] 请执行 `nvm use`（或安装 Node 22）后再运行 dev/build/typecheck。')
  process.exit(1)
}

console.log(`[Node Gate] Node 版本校验通过：${currentVersion}`)
