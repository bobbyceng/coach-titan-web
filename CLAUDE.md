# Coach Titan Web — 开发上下文

## 产品定位

帮助健身爱好者用「拳掌法」估算每餐饮食，支持拍照和手写输入，目标用户是不想精确称重、但希望有结构感的普通增肌减脂人群。核心价值：**模糊输入，够用就好**。

## 常用命令

```bash
npm run dev          # 本地开发
npm run build        # 构建
npm run lint         # ESLint 检查
npm test             # 运行单测（Vitest）
npm run ios          # 一键构建 + 同步 + 打开 Xcode（需要 macOS）
npm run cap:sync     # 只同步到 iOS 工程
```

改完代码后改 iOS，需要先 `npm run cap:sync`，再在 Xcode 里跑。

## 技术栈

- **前端**：React 19 + Vite 7 + Tailwind CSS 4
- **图标**：lucide-react
- **iOS 打包**：Capacitor 8（Web → iOS 原生壳）
- **部署**：Vercel（Web + Serverless Functions）
- **AI 接口**：`api/vision.js`（Vercel Serverless）→ 字节跳动 ARK Vision API（doubao 视觉模型）
- **数据存储**：localStorage，无后端

## 项目结构

```
src/
  App.jsx          # 全部页面逻辑（1700+ 行，单文件架构）
  App.css          # 全局样式系统（Apple 风格，CSS 变量）
  index.css        # Tailwind 入口
  utils/
    nutrition.js   # 拳掌法核心算法（纯函数，有单测）
    nutrition.test.js
api/
  vision.js        # Vercel Serverless，转发 ARK 视觉 API
ios/               # Capacitor iOS 工程（不要手动改这里的文件）
```

## 架构说明

**单文件架构**：所有页面（Home / Input / Advice / History / Profile）都在 `App.jsx` 里，用 `activeTab` 状态切换。这是 vibe coding MVP 的有意选择，改动时不要拆分成多文件，保持在 App.jsx 内操作。

**数据流**：
- localStorage → useState → 页面渲染
- 关键 key：`titan_profile`、`titan_history`、`titan_tone`、`titan_is_training_today`

**AI 识别流程**：
1. 用户拍照 → 前端压缩（1280px, quality=0.7）
2. 发 base64 到 `/api/vision`
3. Serverless 转发 ARK → 返回拳掌份量 JSON
4. 前端填充滑块

## 拳掌法算法（nutrition.js）

```
蛋白质  1掌  = 25g ≈ 150 kcal
碳水    1拳  = 20g ≈ 80 kcal
油脂    1指  = 5g  ≈ 45 kcal
蔬菜    1拳  =      ≈ 25 kcal
```

热量目标：BMR（Mifflin-St Jeor）× 活动系数 × 目标系数（减脂 0.85 / 增肌 1.1 / 维持 1.0）

## 设计规范

- **视觉风格**：Apple 风格，圆角 28px（card），阴影用 `shadow-1`/`shadow-2`
- **色系**：蓝色主色，橙色强调，红色危险/警告
- **触控目标**：按钮最小 44×44px（iOS 规范）
- **安全区域**：底部导航要留 safe area，Content 要有底部 padding 避开 tab bar

## 核心产品决策（不要改动）

- 数据**本地存储**，不上云，这是隐私承诺
- 拳掌滑块范围 **0-8，步长 0.5**
- 免责声明**必须**在每个建议中出现
- 备份导出时**不包含头像**（隐私）

## 当前要解决的问题

**记录流程太繁琐**（用户明确反馈）：
- 现状：拍照 → AI识别 → 滑块微调 → 选餐次+训练状态 → 保存 → 跳转建议页，步骤太多
- 目标：让最常见的记录动作变成 2-3 步完成
- 方向：加「极速记录」路径，一句话描述直接保存，建议在后台生成，不强制跳转

## 测试

单测只覆盖 `nutrition.js`，运行 `npm test` 验证算法。改算法后必须跑测试。改 UI 不需要跑测试。
