# ExifEditor · 图片信息编辑器

> A privacy-friendly, fully client-side EXIF editor. Distributed as both a web app (GitHub Pages) and an Android APK.
>
> 纯前端、本地处理、隐私安全的 EXIF 编辑器 —— 支持 Web 与 Android APK 两种分发方式。

---

## English

All image processing happens entirely in your browser or on your device. **Your photos and metadata are never uploaded to any server.**

### Features

- **Batch editing**: Modify capture time, GPS, device make/model, and software across multiple JPEGs at once.
- **Time shift**: Offset the original capture time of each photo by ±years/months/days/hours/minutes/seconds.
- **GPS presets + random offset**: Save frequently used locations; apply with an optional ±0–5000 m random offset for privacy.
- **Batch ZIP export**: One-click packaged download after editing, or download images one by one.
- **12 languages**: English, Chinese (Simplified / Traditional), Japanese, Korean, French, German, Spanish, Italian, Portuguese, Russian, Arabic.
- **Light / Dark / System** theme switching.
- **Cross-platform**: The same codebase runs in the browser and on Android (packaged as an APK via Capacitor).
- **Zero backend**: Images never leave your device.

### Live Demo

- Web: <https://onefork.github.io/ExifEditor/>
- APK: <https://github.com/onefork/ExifEditor/releases>

### Tech Stack

| Purpose | Dependency |
| --- | --- |
| Build tool | Vite 5 |
| EXIF read/write | [piexifjs](https://github.com/hMatoba/piexifjs) |
| ZIP packaging | JSZip |
| Internationalization | i18next + i18next-browser-languagedetector |
| Android packaging | Capacitor 8 |

The frontend uses native ES Modules — no React / Vue or similar frameworks.

### Development

```bash
npm install      # install dependencies
npm run dev      # start dev server (http://localhost:5173)
```

### Build

```bash
# Web (for GitHub Pages subpath deployment, base = '/ExifEditor/')
npm run build -- --mode web

# Capacitor (default base = '/', for Android WebView)
npm run cap:sync

# APK (requires local Android SDK)
npm run apk:debug     # produces debug APK
npm run apk:release   # produces release APK (unsigned)
```

`npm run dev` requires no SDK; APK builds require a local Android SDK and JDK 21. CI (GitHub Actions) already has these configured — see below.

### Project Structure

```
.
├── index.html              # app entry (SPA)
├── src/
│   ├── main.js             # main logic / event binding
│   ├── exif-reader.js      # EXIF reading
│   ├── exif-writer.js      # EXIF writing
│   ├── exporter.js         # ZIP / single-image export
│   ├── image-store.js      # in-memory image state
│   ├── preset.js           # GPS preset management
│   ├── android-compat.js   # Capacitor platform adapter
│   ├── styles.css          # styles
│   └── i18n/               # 12 language packs
├── android/                # Capacitor-generated Android project
├── capacitor.config.json   # Capacitor config
├── vite.config.js          # Vite config (base switches by mode)
├── .github/workflows/
│   ├── deploy-web.yml      # GitHub Pages deployment
│   └── release-apk.yml     # APK build & release
└── debug-samples/          # test sample notes (images not committed)
```

### CI / CD

The repo ships two GitHub Actions workflows:

1. **`deploy-web.yml`** — Triggers on every push to `main` (or via `workflow_dispatch`). Builds with `vite build --mode web` (base = `/ExifEditor/`) and deploys to GitHub Pages.
2. **`release-apk.yml`** — Triggers on push to `main` (builds APK and uploads as a workflow artifact, retained 14 days), on pushing a `v*` tag (builds and publishes to GitHub Release), or via `workflow_dispatch`. Uses Node 22, JDK 21, and Gradle 8.14.3 (preinstalled via `setup-gradle@v4`).

```bash
# Publish a new APK release:
git tag v0.1.0
git push origin v0.1.0
```

> The release APK is currently unsigned (`app-release-unsigned.apk`). For a signed release build, either sign locally with your own keystore or configure signing material in repository Secrets later.

### Privacy

- All image reading, EXIF parsing/writing, and ZIP packaging happen inside your device's browser or app.
- No analytics, no upload API, no calls to any third-party server.
- The web version is statically hosted on GitHub Pages; the APK runs fully offline.

### License

[GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0).

### Contributing

Issues and PRs are welcome — please base PRs on the `main` branch. Before submitting, make sure:

- `npm run dev` and `npm run build -- --mode web` both succeed locally.
- No new runtime network requests are introduced (keep it fully client-side).

---

## 中文

所有图片处理都在浏览器 / 本机完成，**不会向任何服务器上传你的图片或元数据**。

### 特性

- **批量编辑**: 一次性修改多张 JPEG 的拍摄时间、GPS、设备品牌型号、Software。
- **时间平移**: 在每张照片原始时间基础上 ±年/月/日/时/分/秒。
- **GPS 预设 + 随机偏移**: 保存常用地点预设，应用时可叠加 ±0–5000 m 随机偏移保护隐私。
- **批量 ZIP 导出**: 编辑完成后一键打包下载，或单张下载。
- **12 种语言**: 英语、中文（简/繁）、日语、韩语、法语、德语、西班牙语、意大利语、葡萄牙语、俄语、阿拉伯语。
- **浅色 / 深色 / 跟随系统** 主题切换。
- **跨平台**: 同一份代码同时跑在浏览器和 Android（通过 Capacitor 包装成 APK）。
- **零后端**: 图片永不离开你的设备。

### 在线体验

- Web: <https://onefork.github.io/ExifEditor/>
- APK 下载: <https://github.com/onefork/ExifEditor/releases>

### 技术栈

| 用途 | 依赖 |
| --- | --- |
| 构建工具 | Vite 5 |
| EXIF 读写 | [piexifjs](https://github.com/hMatoba/piexifjs) |
| ZIP 打包 | JSZip |
| 国际化 | i18next + i18next-browser-languagedetector |
| Android 包装 | Capacitor 8 |

前端使用原生 ES Module，无 React / Vue 等框架。

### 本地开发

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 (http://localhost:5173)
```

### 构建

```bash
# Web (用于 GitHub Pages 子路径部署，base = '/ExifEditor/')
npm run build -- --mode web

# Capacitor (默认 base = '/', 适合 Android WebView)
npm run cap:sync

# APK (需要本地配置 Android SDK)
npm run apk:debug     # 产出 debug APK
npm run apk:release   # 产出 release APK (未签名)
```

`npm run dev` 不需要任何 SDK；APK 构建需要本地 Android SDK 与 JDK 21。CI（GitHub Actions）已配置好这些，详见下文。

### 项目结构

```
.
├── index.html              # 应用入口 (SPA 单页)
├── src/
│   ├── main.js             # 应用主逻辑 / 事件绑定
│   ├── exif-reader.js      # EXIF 读取
│   ├── exif-writer.js      # EXIF 写入
│   ├── exporter.js         # ZIP / 单张导出
│   ├── image-store.js      # 内存图片管理
│   ├── preset.js           # GPS 预设管理
│   ├── android-compat.js   # Capacitor 平台适配
│   ├── styles.css          # 样式
│   └── i18n/               # 12 种语言翻译
├── android/                # Capacitor 生成的 Android 工程
├── capacitor.config.json   # Capacitor 配置
├── vite.config.js          # Vite 配置 (base 按 mode 切换)
├── .github/workflows/
│   ├── deploy-web.yml      # GitHub Pages 部署
│   └── release-apk.yml     # APK 构建与发布
└── debug-samples/          # 测试样张说明 (图片本身不入库)
```

### CI / CD

仓库内置两条 GitHub Actions 工作流：

1. **`deploy-web.yml`** — 推送到 `main` 时触发（也支持 `workflow_dispatch` 手动触发）。用 `vite build --mode web` 构建（base = `/ExifEditor/`）并部署到 GitHub Pages。
2. **`release-apk.yml`** — 推送到 `main` 时构建 APK 并上传为 workflow artifact（保留 14 天）；推送 `v*` 形式的 tag（如 `v0.1.0`）时构建并发布到对应的 GitHub Release；也支持 `workflow_dispatch`。使用 Node 22、JDK 21、Gradle 8.14.3（经 `setup-gradle@v4` 预装）。

```bash
# 发布新版本 APK:
git tag v0.1.0
git push origin v0.1.0
```

> Release APK 当前为未签名版（`app-release-unsigned.apk`）。如需签名发布版，请用本地 keystore 自行构建，或后续在仓库 Secrets 中配置签名材料。

### 隐私

- 所有图片读取、EXIF 解析与写入、ZIP 打包都在你设备的浏览器或 App 内完成。
- 没有 Analytics、没有上传 API、没有调用任何第三方服务器。
- Web 版由 GitHub Pages 静态托管；APK 版完全离线运行。

### 许可证

[GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0)。

### 贡献

欢迎提 Issue 反馈 Bug 或建议功能；PR 请基于 `main` 分支提交。提交前请确保：

- `npm run dev` 与 `npm run build -- --mode web` 本地都能成功。
- 不引入新的运行时网络请求（保持纯客户端）。
