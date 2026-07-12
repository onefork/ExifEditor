# ExifEditor · 图片信息编辑器

> A privacy-friendly, fully client-side EXIF editor. Refactored into a 4-layer architecture that ships to 7 distribution channels (Web, Android, CLI, HTTP API, Electron, Vue SPA, React SPA) from a single codebase.
>
> 纯客户端、本地处理、隐私安全的 EXIF 编辑器 —— 已重构为 4 层分离架构，同一份核心代码支持 7 种分发渠道（Web、Android、CLI、HTTP API、Electron、Vue SPA、React SPA）。

---

## English

All image processing happens entirely in your browser or on your device. **Your photos and metadata are never uploaded to any server.**

### Features

- **Batch editing**: Modify capture time, GPS, device make/model, and Software across multiple JPEGs at once.
- **Time shift**: Offset the original capture time of each photo by ±years/months/days/hours/minutes/seconds.
- **GPS presets + random offset**: Save frequently used locations; apply with an optional ±0–5000 m random offset for privacy.
- **Batch ZIP export / single-image export**: One-click packaged download after editing.
- **12 languages**: en, zh-CN, zh-TW, ja, ko, de, es, fr, pt, it, ru, ar.
- **3 themes**: Light / Dark / System.
- **Arabic RTL**: Right-to-left layout activated for Arabic.
- **Privacy**: Pure client-side, nothing is uploaded.

### Architecture (4 Layers, 7 Channels)

The project is split into four decoupled layers. The core layer has zero platform dependencies and is reused across every distribution channel.

| Layer | Path | Responsibility |
| --- | --- | --- |
| Core | `src/core/` | Pure business logic, zero platform deps (utils, exif-reader, exif-writer, image-store, preset, exporter, i18n + 12 language packs, index barrel) |
| Platform | `src/platform/` | Adapter interfaces (`types.js`) + 4 implementations: `web/`, `capacitor/`, `node/`, `electron/` |
| UI | `src/ui/` | Six interfaces: `web/`, `cli/`, `api/`, `vue/`, `react/`, `electron/` |
| Entry | `src/app/` | Bootstrap for each channel: `web.js`, `cli.js`, `api.js`, `vue.js`, `react.js`, `electron-main.js` |

The 7 distribution channels and their commands:

| # | Channel | Stack | Command |
| --- | --- | --- | --- |
| 1 | Web | Native JS | `npm run dev` / `npm run build -- --mode web` |
| 2 | Capacitor / Android | Capacitor 8 | `npm run cap:sync` / `npm run apk:debug` |
| 3 | CLI | Node.js + @inquirer/prompts | `npm run start:cli -- --help` |
| 4 | HTTP API | Node.js built-in `http` (port 3000) | `npm run start:api` |
| 5 | Electron | Electron | `npm run start:electron` |
| 6 | Vue SPA | Vue 3 + @vitejs/plugin-vue | `npm run build:vue` |
| 7 | React SPA | React 18 + @vitejs/plugin-react | `npm run build:react` |

### Live Demo

- Web: <https://onefork.github.io/ExifEditor/>
- APK: <https://github.com/onefork/ExifEditor/releases>
- Repo: <https://github.com/onefork/ExifEditor>

### Tech Stack

| Purpose | Dependency |
| --- | --- |
| EXIF read/write | [piexifjs](https://github.com/hMatoba/piexifjs) |
| ZIP packaging | jszip |
| Internationalization | i18next + i18next-browser-languagedetector |
| Android packaging | @capacitor/core, @capacitor/android, @capacitor/cli, @capacitor/filesystem, @capacitor/local-notifications, @capacitor/share, @capacitor/status-bar (v8) |
| CLI prompts (optional) | @inquirer/prompts |
| Node image decoding (optional) | sharp |
| React SPA (optional) | react, react-dom |
| Build tool | vite |
| Vue plugin (dev) | @vitejs/plugin-vue |
| React plugin (dev) | @vitejs/plugin-react |

`package.json` also exposes `exports` (`./core`, `./core/*`, `./platform/*`) for programmatic reuse, and a `bin` entry (`exif-editor` -> `src/app/cli.js`) for global CLI install.

### Build Configuration

`vite.config.js` is multi-mode:

- `--mode web` / `--mode vue` / `--mode react` -> `base = '/ExifEditor/'` (GitHub Pages subpath).
- Default (production) -> `base = '/'` (Capacitor WebView treats `dist/` as root).
- Build target `es2022` (supports top-level await in entry layer).
- `@vitejs/plugin-vue` and `@vitejs/plugin-react` are dynamically imported only in their respective modes, with `try/catch` fallback if the package is missing.
- Vue and React modes use their own HTML entries (`index-vue.html`, `index-react.html`).

### Development

```bash
npm install      # install dependencies
npm run dev      # start Web dev server (http://localhost:5173)
```

### Build & Run (7 Channels)

```bash
# 1. Web (GitHub Pages subpath, base = '/ExifEditor/')
npm run build -- --mode web

# 2. Capacitor / Android (default base = '/', for Android WebView)
npm run cap:sync
npm run apk:debug      # debug APK (requires local Android SDK + JDK 21)
npm run apk:release    # release APK (unsigned)

# 3. CLI
npm run start:cli -- --help

# 4. HTTP API (default port 3000)
npm run start:api

# 5. Electron
npm run start:electron

# 6. Vue SPA
npm run build:vue

# 7. React SPA
npm run build:react
```

`npm run dev`, the CLI, the API, and the SPA builds require no SDK. APK builds require a local Android SDK and JDK 21; CI (GitHub Actions) already has these configured.

### Project Structure

```
.
├── index.html              # Web main page (points to ./src/app/web.js)
├── index-vue.html          # Vue SPA entry
├── index-react.html        # React SPA entry
├── src/
│   ├── core/               # Pure business logic (zero platform deps)
│   │   ├── utils.js        # pure helpers
│   │   ├── exif-reader.js  # readExif(file, { imageDecoder })
│   │   ├── exif-writer.js  # writeExif(file, edits)
│   │   ├── image-store.js  # createImageStore({ readExif })
│   │   ├── preset.js       # initPresetManager({ storage })
│   │   ├── exporter.js     # initExporter({ fileSaver, notifier })
│   │   ├── i18n.js         # initI18n({ language })
│   │   ├── i18n/           # 12 language packs
│   │   └── index.js        # barrel re-export
│   ├── platform/           # Platform adapter layer
│   │   ├── types.js        # 4 adapter interfaces (JSDoc)
│   │   ├── web/            # Web adapters (localStorage, Canvas, <a download>, Notification API)
│   │   ├── capacitor/      # Capacitor adapters (Filesystem, LocalNotifications, Share)
│   │   ├── node/           # Node.js adapters (JSON file, sharp, fs, console.log)
│   │   └── electron/       # Electron adapters (JSON file, dialog, Electron Notification)
│   ├── ui/                 # UI layer
│   │   ├── web/            # Native JS UI (main.js, styles.css)
│   │   ├── cli/            # CLI UI (commands.js, prompts.js, formatter.js, index.js)
│   │   ├── api/            # HTTP API UI (server.js, routes/, middleware/)
│   │   ├── vue/            # Vue SPA (App.vue, components/, composables/)
│   │   ├── react/          # React SPA (App.jsx, components/, hooks/)
│   │   └── electron/       # Electron preload.js
│   └── app/                # Entry layer
│       ├── web.js          # Web / Capacitor entry
│       ├── cli.js          # CLI entry (#!/usr/bin/env node)
│       ├── api.js          # HTTP API entry
│       ├── vue.js          # Vue SPA entry
│       ├── react.js        # React SPA entry
│       └── electron-main.js # Electron main process
├── android/                # Capacitor-generated Android project
├── capacitor.config.json   # Capacitor config (appId=com.exifeditor.app, webDir=dist)
├── vite.config.js          # Vite config (multi-mode, es2022, dynamic Vue/React plugins)
├── package.json            # includes exports and bin fields
├── .github/workflows/
│   ├── deploy-web.yml      # GitHub Pages deployment
│   └── release-apk.yml     # APK build & release
└── LICENSE                 # AGPL-3.0
```

### CI / CD

The repo ships two GitHub Actions workflows:

1. **`deploy-web.yml`** — On push to `main`, builds with `vite build --mode web` and deploys to GitHub Pages.
2. **`release-apk.yml`** — On push to `main`, builds APK and uploads as a workflow artifact (retained 14 days); on pushing a `v*` tag, builds and publishes to GitHub Release. Environment: Node 22, JDK 21, Gradle 8.14.3.

```bash
# Publish a new APK release:
git tag v0.1.0
git push origin v0.1.0
```

### Privacy

- All image reading, EXIF parsing/writing, and ZIP packaging happen inside your device's browser or app.
- No analytics, no upload API, no calls to any third-party server.
- The web version is statically hosted on GitHub Pages; the APK runs fully offline.

### License

[GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0).

---

## 中文

所有图片处理都在浏览器 / 本机完成，**不会向任何服务器上传你的图片或元数据**。

### 特性

- **批量编辑**: 一次性修改多张 JPEG 的拍摄时间、GPS、设备品牌型号、Software。
- **时间平移**: 在每张照片原始时间基础上 ±年/月/日/时/分/秒。
- **GPS 预设 + 随机偏移**: 保存常用地点预设，应用时可叠加 ±0–5000 m 随机偏移保护隐私。
- **批量 ZIP 导出 / 单张导出**: 编辑完成后一键打包下载，或单张下载。
- **12 种语言**: en、zh-CN、zh-TW、ja、ko、de、es、fr、pt、it、ru、ar。
- **3 种主题**: 浅色 / 深色 / 跟随系统。
- **阿拉伯语 RTL**: 选中阿拉伯语时自动启用从右到左布局。
- **隐私**: 纯客户端，不上传任何数据。

### 架构（4 层分离，7 种分发渠道）

项目拆分为四个解耦的层。核心层零平台依赖，被所有分发渠道复用。

| 层 | 路径 | 职责 |
| --- | --- | --- |
| 核心层 Core | `src/core/` | 纯业务逻辑，零平台依赖（utils、exif-reader、exif-writer、image-store、preset、exporter、i18n + 12 语言包、index 桶导出） |
| 平台层 Platform | `src/platform/` | 适配器接口（`types.js`）+ 4 套实现：`web/`、`capacitor/`、`node/`、`electron/` |
| 界面层 UI | `src/ui/` | 六个界面：`web/`、`cli/`、`api/`、`vue/`、`react/`、`electron/` |
| 入口层 Entry | `src/app/` | 各渠道启动入口：`web.js`、`cli.js`、`api.js`、`vue.js`、`react.js`、`electron-main.js` |

7 种分发渠道及对应命令：

| # | 渠道 | 技术栈 | 命令 |
| --- | --- | --- | --- |
| 1 | Web | 原生 JS | `npm run dev` / `npm run build -- --mode web` |
| 2 | Capacitor / Android | Capacitor 8 | `npm run cap:sync` / `npm run apk:debug` |
| 3 | CLI | Node.js + @inquirer/prompts | `npm run start:cli -- --help` |
| 4 | HTTP API | Node.js 内置 `http`（默认端口 3000） | `npm run start:api` |
| 5 | Electron | Electron | `npm run start:electron` |
| 6 | Vue SPA | Vue 3 + @vitejs/plugin-vue | `npm run build:vue` |
| 7 | React SPA | React 18 + @vitejs/plugin-react | `npm run build:react` |

### 在线体验

- Web: <https://onefork.github.io/ExifEditor/>
- APK 下载: <https://github.com/onefork/ExifEditor/releases>
- 仓库: <https://github.com/onefork/ExifEditor>

### 技术栈

| 用途 | 依赖 |
| --- | --- |
| EXIF 读写 | [piexifjs](https://github.com/hMatoba/piexifjs) |
| ZIP 打包 | jszip |
| 国际化 | i18next + i18next-browser-languagedetector |
| Android 包装 | @capacitor/core、@capacitor/android、@capacitor/cli、@capacitor/filesystem、@capacitor/local-notifications、@capacitor/share、@capacitor/status-bar（v8） |
| CLI 交互提示（可选） | @inquirer/prompts |
| Node 图像解码（可选） | sharp |
| React SPA（可选） | react、react-dom |
| 构建工具 | vite |
| Vue 插件（dev） | @vitejs/plugin-vue |
| React 插件（dev） | @vitejs/plugin-react |

`package.json` 还通过 `exports` 字段（`./core`、`./core/*`、`./platform/*`）暴露核心模块供外部复用，并提供 `bin` 字段（`exif-editor` -> `src/app/cli.js`）支持全局安装 CLI。

### 构建配置

`vite.config.js` 为多模式配置：

- `--mode web` / `--mode vue` / `--mode react` -> `base = '/ExifEditor/'`（GitHub Pages 子路径部署）。
- 默认（production） -> `base = '/'`（Capacitor WebView 把 `dist/` 当根）。
- 构建目标 `es2022`（支持入口层 top-level await）。
- `@vitejs/plugin-vue` 与 `@vitejs/plugin-react` 仅在各自模式下动态导入，包未安装时 `try/catch` 回退跳过。
- Vue / React 模式使用各自 HTML 入口（`index-vue.html`、`index-react.html`）。

### 本地开发

```bash
npm install      # 安装依赖
npm run dev      # 启动 Web 开发服务器 (http://localhost:5173)
```

### 构建与运行（7 种渠道）

```bash
# 1. Web (GitHub Pages 子路径，base = '/ExifEditor/')
npm run build -- --mode web

# 2. Capacitor / Android (默认 base = '/', 适合 Android WebView)
npm run cap:sync
npm run apk:debug      # 产出 debug APK（需要本地 Android SDK + JDK 21）
npm run apk:release    # 产出 release APK（未签名）

# 3. CLI
npm run start:cli -- --help

# 4. HTTP API（默认端口 3000）
npm run start:api

# 5. Electron
npm run start:electron

# 6. Vue SPA
npm run build:vue

# 7. React SPA
npm run build:react
```

`npm run dev`、CLI、API 以及 SPA 构建均不需要任何 SDK；APK 构建需要本地 Android SDK 与 JDK 21，CI（GitHub Actions）已配置好这些。

### 项目结构

```
.
├── index.html              # Web 主页面（指向 ./src/app/web.js）
├── index-vue.html          # Vue SPA 入口
├── index-react.html        # React SPA 入口
├── src/
│   ├── core/               # 纯业务逻辑层（零平台依赖）
│   │   ├── utils.js        # 纯函数集合
│   │   ├── exif-reader.js  # readExif(file, { imageDecoder })
│   │   ├── exif-writer.js  # writeExif(file, edits)
│   │   ├── image-store.js  # createImageStore({ readExif })
│   │   ├── preset.js       # initPresetManager({ storage })
│   │   ├── exporter.js     # initExporter({ fileSaver, notifier })
│   │   ├── i18n.js         # initI18n({ language })
│   │   ├── i18n/           # 12 个语言包
│   │   └── index.js        # 桶导出
│   ├── platform/           # 平台适配层
│   │   ├── types.js        # 4 个适配器接口（JSDoc）
│   │   ├── web/            # Web 适配器（localStorage、Canvas、<a download>、Notification API）
│   │   ├── capacitor/      # Capacitor 适配器（Filesystem、LocalNotifications、Share）
│   │   ├── node/           # Node.js 适配器（JSON 文件、sharp、fs、console.log）
│   │   └── electron/       # Electron 适配器（JSON 文件、dialog、Electron Notification）
│   ├── ui/                 # 界面层
│   │   ├── web/            # 原生 JS 界面（main.js、styles.css）
│   │   ├── cli/            # CLI 界面（commands.js、prompts.js、formatter.js、index.js）
│   │   ├── api/            # HTTP API 界面（server.js、routes/、middleware/）
│   │   ├── vue/            # Vue SPA（App.vue、components/、composables/）
│   │   ├── react/          # React SPA（App.jsx、components/、hooks/）
│   │   └── electron/       # Electron preload.js
│   └── app/                # 入口层
│       ├── web.js          # Web / Capacitor 入口
│       ├── cli.js          # CLI 入口（#!/usr/bin/env node）
│       ├── api.js          # HTTP API 入口
│       ├── vue.js          # Vue SPA 入口
│       ├── react.js        # React SPA 入口
│       └── electron-main.js # Electron 主进程
├── android/                # Capacitor 生成的 Android 工程
├── capacitor.config.json   # Capacitor 配置（appId=com.exifeditor.app, webDir=dist）
├── vite.config.js          # Vite 配置（多模式，es2022，动态加载 Vue/React 插件）
├── package.json            # 含 exports 与 bin 字段
├── .github/workflows/
│   ├── deploy-web.yml      # GitHub Pages 部署
│   └── release-apk.yml     # APK 构建与发布
└── LICENSE                 # AGPL-3.0
```

### CI / CD

仓库内置两条 GitHub Actions 工作流：

1. **`deploy-web.yml`** — 推送到 `main` 时用 `vite build --mode web` 构建并部署到 GitHub Pages。
2. **`release-apk.yml`** — 推送到 `main` 时构建 APK 并上传为 workflow artifact（保留 14 天）；推送 `v*` 形式的 tag 时构建并发布到 GitHub Release。环境：Node 22、JDK 21、Gradle 8.14.3。

```bash
# 发布新版本 APK:
git tag v0.1.0
git push origin v0.1.0
```

### 隐私

- 所有图片读取、EXIF 解析与写入、ZIP 打包都在你设备的浏览器或 App 内完成。
- 没有 Analytics、没有上传 API、没有调用任何第三方服务器。
- Web 版由 GitHub Pages 静态托管；APK 版完全离线运行。

### 许可证

[GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0)。
