# Coach Titan MVP 面试向更新日志

## 2026-03-17
- 目标：简化拍照记录流程，解决「滑块不知道有什么用」的用户反馈
- 动作：
  - 重设计拍照记录页为三阶段流程：① 上传表单 → ② 结果卡片 → ③ 可选微调
  - 阶段一重排布局：餐次 Tab（紧凑）→ 训练开关（是/否 按钮）→ 上传区 → 描述输入 → 唯一主 CTA「开始 AI 识别」
  - 阶段二新增结果卡片：显示估算 kcal、三大营养素信号灯（✓/⚠️/↓ 与推荐值对比）、AI 简评前 30 字
  - 阶段三用 +/- Stepper 替代拖动 Slider，展示「1.5 掌」「1.0 拳」等直觉单位
  - 删除 Input tab 中的 4 个滑块、「一句话估算拳掌」按钮、「生成下一餐建议」按钮
  - 新增 `getMealSignals()` 函数：按 `DEFAULT_HAND_MAP` 推荐值 ±40% 判断营养素状态
  - 新增 `Stepper` 和 `PhotoResultCard` 组件
  - 修改 Vision API prompt 新增 `comment` 字段：让模型直接返回一句话营养评价（≤20字），无需额外 LLM 调用
  - 删除 Advice tab 中"AI 解释（预留）"占位块，不再展示未实现的功能入口
  - 重排 Advice tab 布局：「餐食描述」提升为独立 bubble 并移至「下一步建议」上方，信息层级更清晰
- 验证：build 通过；nutrition.js 单测 5/5 通过；完整拍照→结果卡片→保存→建议页流程可走通
- 影响：拍照记录从「拍照→滑块→多按钮」简化为「拍照→看卡片→一键保存」；建议页去除占位内容，餐食上下文更突出

## 2026-03-13
- 目标：降低记录门槛，首页一句话即可完成记录
- 动作：
  - 新增「极速记录」路径：首页输入一句话描述 → 立刻保存（使用目标对应的默认拳掌值）→ AI 在后台悄悄更新份量，不阻塞用户
  - 重构首页布局：移除两个大操作卡片（拍照记录 / 快速输入）与独立今日概览卡；改为单行问候 + 今日统计；统一输入栏内嵌相机图标、文字输入和发送按钮；餐次选择改为紧凑 Tab（早餐/午餐/晚餐/加餐）
  - 修复 iOS 部署 PATH 问题：`package.json` 中 `vite`/`cap` 命令改用 `./node_modules/.bin/` 绝对路径，解决 `sh: vite: command not found` 与 `sh: cap: command not found`
  - 新增 `CLAUDE.md`：为项目建立持久开发上下文，记录架构决策、设计规范和核心产品约束
- 验证：`npm run build` 通过；`npm run ios` 链路全程可执行
- 影响：首页交互区从 6+ 个点击区收缩到 3 个；最常见的记录场景从 6 步缩短到 2 步（输入 → 回车）

## 2026-03-05
- 目标：提高 AI 识别链路稳定性，并把 iOS 真机发布流程标准化。
- 动作：Vision API 改为支持 `VITE_VISION_API_URL`（默认 `/api/vision`）；增加 20s 超时与 AbortController；完善响应解析容错与前端错误提示条（`aiError`）；新增发布脚本 `cap:sync` / `cap:open` / `ios`；更新 README 的 Xcode 真机部署步骤。
- 验证：`npm run lint`、`npm test`、`npm run build`、`npm run cap:sync` 均通过。
- 影响：弱网/接口异常下用户可感知、可恢复；iOS 发布路径从“会的人才会”变成可复制的标准流程。

## 2026-02-25
- 目标：提升数据安全性、可移植性与工程质量
- 动作：统一备份 Schema v1 (`{version, exportedAt, payload}`)，导出剔除 `profile.avatar`；导入改为覆盖策略并增加 best-effort 自动备份；为 `saveLS` 增加 `try/catch`；引入 Vitest 并抽离 `estimateMealByHand` 至 `src/utils/nutrition.js` 进行单测；历史记录新增 `createdAt` (ISO) 字段。
- 验证：`npm run test` 通过；导入导出 JSON 结构符合 v1 规范；模拟 `localStorage` 写入失败不崩溃；`avatar` 在导入时被正确保留。
- 影响：增强了用户数据的安全感与跨设备迁移的可靠性；建立了自动化测试基建，降低后续重构风险。

### GitHub Release Notes (v1.1.0)
#### 🚀 Features & Improvements
- **Data Security**: New Backup Schema v1 with auto-backup before import.
- **Robustness**: Added `try/catch` to `localStorage` operations to prevent crashes on storage limits.
- **Portability**: Standardized history timestamps using ISO 8601 (`createdAt`).
- **Testing**: Integrated Vitest and added unit tests for core nutrition logic.

#### 🛠 Technical Changes
- Extracted `estimateMealByHand` to `src/utils/nutrition.js` for better testability.
- Excluded `profile.avatar` from backups to optimize file size.
- Updated import logic to use an overwrite strategy with user confirmation.

## 2026-02-03
- 目标：明确拍照与手动入口的功能边界
- 动作：引入输入模式（拍照/快速输入），手动模式隐藏拍照区并聚焦文本输入
- 验证：拍照入口显示拍照区；快速输入入口不显示拍照区
- 影响：入口差异更清晰，手动流程更简洁

- 目标：提升按钮可理解性
- 动作：主按钮改为“一句话估算拳掌”，副按钮改为“生成下一餐建议”，并补充说明文案
- 验证：新用户能在 5 秒内说清两个按钮的作用
- 影响：降低理解成本

- 目标：改善手机端操作区拥挤
- 动作：压缩行动按钮布局，移除“套用默认拳掌法”，优化间距
- 验证：移动端“实时估算”与按钮区分开显示
- 影响：减少视觉黏连感

- 目标：提升拍照估算可感知性与稳定性
- 动作：新增“AI 估算份量”显式触发与完成/失败状态提示，滑块默认隐藏，必要时再微调
- 验证：拍照后需点击按钮才估算，成功后自动填入拳掌，失败有清晰提示
- 影响：拍照流程更符合用户心智

- 目标：修复本地调试时的 CORS 拦截
- 动作：为 `/api/vision` 增加 CORS 与预检支持
- 验证：本地 `localhost` 可正常调用远端接口
- 影响：开发调试更稳定

- 目标：提升手机拍照成功率
- 动作：上传前自动压缩图片，允许单图估算（双角度更准）
- 验证：手机拍照后可点击“AI 估算份量”，单图也能返回结果
- 影响：移动端稳定性提升

## 2026-02-02
- 目标：形成可展示的 MVP 闭环与面试叙述路径
- 动作：补充 1 分钟 Demo 脚本与演示自检清单
- 验证：演示流程可走通（记录 → 建议 → 日志 → 备份导出/导入）
- 影响：面试叙述更连贯、演示更稳定

- 目标：建立饮食记录与复盘的最小闭环
- 动作：统一 `MealEntry v1` 结构、今日概览与 7 天复盘摘要，并加入性别系数影响日目标热量
- 验证：当天新增记录后概览与复盘数据实时更新；填写性别后热量参考值变化
- 影响：复盘可解释性增强

- 目标：提升数据可控性
- 动作：新增本地备份导出/导入（覆盖恢复）
- 验证：导出 JSON 可下载，导入后数据完整恢复
- 影响：增强演示可信度

- 目标：Apple 风格视觉统一
- 动作：引入语义色与统一按钮/卡片/输入/导航样式
- 验证：关键页面风格一致且触控目标满足 44x44
- 影响：整体观感更高级

- 目标：构建验证与记录
- 动作：运行 `npm run build` 并记录 lint 现状
- 验证：build 通过；lint 因第三方/产物文件未通过
- 影响：明确可交付状态

## 2026-01-27
- 目标：提升拍照识别可信度，减少用户对结果的不确定感
- 动作：在拍照指引中补充“光线/距离/倾斜影响识图”的简短提示
- 验证：拍照完成率、识图反馈满意度（1-5 分）
- 影响：降低拍照失败率（待验证）

## 2026-01-26
- 目标：降低手动输入负担，提高记录效率
- 动作：支持双角度拍照识别（俯拍 + 侧面）并接入 Vercel AI Vision
- 验证：完成率、识图准确感知评分、平均记录耗时
- 影响：提升记录效率与可信度（待验证）

## 2026-01-20
- 目标：提升首屏可用性与记录路径清晰度
- 动作：重构底部导航与主界面分区（记录/日志/档案）
- 验证：新用户首次记录所需步骤数
- 影响：降低用户上手成本（待验证）

- 目标：提升 PWA 使用体验
- 动作：更新 PWA 图标与资源配置
- 验证：安装成功率、启动一致性
- 影响：提升产品可信度与可用性（待验证）

- 目标：提高记录入口可发现性
- 动作：新增拍照入口与图片选择器
- 验证：拍照入口点击率、记录转化率
- 影响：提高记录转化（待验证）

- 目标：保证 iOS 真机可用
- 动作：补充 iOS 权限配置
- 验证：真机运行稳定性
- 影响：减少 iOS 端异常（待验证）

## 2026-01-19
- 目标：解决 PWA 首页缓存导致的数据异常
- 动作：修复 PWA Home Screen 缓存问题
- 验证：复现场景测试
- 影响：降低缓存导致的异常（待验证）

- 目标：建立稳定的部署通路
- 动作：配置并触发 Vercel 部署流程
- 验证：部署成功率、回滚可用性
- 影响：提高发布效率（待验证）

- 目标：完成 MVP 基础搭建
- 动作：初始化 Coach Titan Web 项目结构
- 验证：可运行 + 可迭代
- 影响：建立产品迭代起点
