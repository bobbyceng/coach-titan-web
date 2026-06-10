# Coach Titan — AI 饮食教练 MVP

**拍一张你正在吃的东西，AI 视觉模型估算热量与营养构成，给出饮食建议。**

一个可快速部署到 iPhone 的饮食估算 MVP（React + Vite + Capacitor iOS）。验证的核心假设：饮食记录最大的流失点是手动输入太麻烦——拍照 + 视觉模型估算能不能把记录成本降到一次点击。

## 工作流程

```
拍照 / 选图
  → 前端压缩上传至 /api/vision
  → Vercel Serverless 代理（隐藏 API key，转发到 ARK 视觉模型）
  → 返回食物识别 + 热量/营养估算
  → 前端展示结果与建议
```

**设计要点：** API key 只存在于 Serverless 函数环境变量中，客户端不持有任何密钥；前端通过 `VITE_VISION_API_URL` 解耦后端地址，本地/线上随时切换。

## 本地开发

```bash
npm install
npm run dev
```

## 质量检查

```bash
npm run lint
npm test
npm run build
```

## 部署到 iPhone（Xcode）

0. 先做本机预检（强烈建议）：

```bash
npm run ios:preflight
```

如果提示 xcode-select 指向 CommandLineTools，请先执行：

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

1. 先构建并同步到 iOS 工程：

```bash
npm run cap:sync
```

2. 打开 Xcode：

```bash
npm run cap:open
```

3. 在 Xcode 中：
- 选择 `App` target
- `Signing & Capabilities` 里选择你的 Team
- 连接 iPhone 或选择模拟器
- 点击 Run（▶）

> 一键命令：`npm run ios`

## AI 接口配置

前端默认请求 `"/api/vision"`。可用环境变量覆盖：

```bash
VITE_VISION_API_URL=https://your-domain.com/api/vision
```

在 `.env.local` 添加后重启开发服务。

## 目录说明

- `src/`：前端页面与逻辑
- `api/vision.js`：Vercel Serverless 代理（转发到 ARK）
- `ios/`：Capacitor iOS 工程
