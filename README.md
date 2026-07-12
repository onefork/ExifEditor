# 图片信息编辑器 · ExifEditor

> 纯前端、本地处理、隐私安全的 EXIF 编辑器 —— 支持 Web 与 Android APK 两种分发方式。
>
> A privacy-friendly, fully client-side EXIF editor. Distributed as both a web app (GitHub Pages) and an Android APK.

所有图片处理都在浏览器 / 本机完成，**不会向任何服务器上传你的图片或元数据**。

---

## 特性 / Features

- **批量编辑**: 一次性修改多张 JPEG 的拍摄时间、GPS、设备品牌型号、Software。
- **时间平移**: 在每张照片原始时间基础上 ±年/月/日/时/分/秒。
- **GPS 预设 + 随机偏移**: 保存常用地点预设，应用时可叠加 ±0–2000 m 随机偏移保护隐私。
- **批量 ZIP 导出**: 编辑完成后一键打包下载，或单张下载。
- **13 种语言**: 中文(简/繁)、英语、日语、韩语、法语、德语、西班牙语、意大利语、葡萄牙语、俄语、阿拉伯语。
- **浅色 / 深色 / 跟随系统** 主题切换。
- **跨平台**: 同一份代码同时跑在浏览器和 Android（通过 Capacitor 包装成 APK）。
- **零后端**: 图片永不离开你的设备。

---

## 在线体验 / Live Demo

- Web: <https://onefork.github.io/ExifEditor/>
- APK 下载 / Download APK: <https://github.com/onefork/ExifEditor/releases>

---

## 技术栈 / Tech Stack

| 用途 | 依赖 |
| --- | --- |
| 构建工具 | Vite 5 |
| EXIF 读写 | [piexifjs](https://github.com/hMatoba/piexifjs) |
| ZIP 打包 | JSZip |
| 国际化 | i18next + i18next-browser-languagedetector |
| Android 包装 | Capacitor 8 |

前端使用原生 ES Module，无 React / Vue 等框架。

---

## 本地开发 / Development

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 (http://localhost:5173)
```

### 构建 / Build

```bash
# Web (用于 GitHub Pages 子路径部署，base = '/ExifEditor/')
npm run build -- --mode web

# Capacitor (默认 base = '/', 适合 Android WebView)
npm run cap:sync

# APK (需要本地配置 Android SDK)
npm run apk:debug     # 产出 debug APK
npm run apk:release   # 产出 release APK (未签名)
```

`npm run dev` 不需要任何 SDK；APK 构建需要本地 Android SDK 与 JDK 17。CI（GitHub Actions）已配置好这些，详见下文。

---

## 项目结构 / Project Structure

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
│   └── i18n/               # 13 种语言翻译
├── android/                # Capacitor 生成的 Android 工程
├── capacitor.config.json   # Capacitor 配置
├── vite.config.js          # Vite 配置 (base 按 mode 切换)
├── .github/workflows/
│   ├── deploy-web.yml      # GitHub Pages 部署
│   └── release-apk.yml     # APK 发布到 Releases
└── debug-samples/          # 测试样张说明 (图片本身不入库)
```

---

## CI / CD

仓库内置两条 GitHub Actions 工作流：

1. **`deploy-web.yml`** — 推送到 `main` 且改动涉及 `src/`、`index.html`、`vite.config.js`、`package*.json` 或工作流本身时触发。用 `vite build --mode web` 构建（base = `/ExifEditor/`）并部署到 GitHub Pages。
2. **`release-apk.yml`** — 推送 `v*` 形式的 tag（如 `v0.1.0`）时触发。执行 `cap:sync` 后用 Gradle 构建 debug + release APK，上传到对应的 GitHub Release。

```bash
# 发布新版本 APK:
git tag v0.1.0
git push origin v0.1.0
```

> Release APK 当前为未签名版（`app-release-unsigned.apk`）。如需签名发布版，请用本地 keystore 自行构建，或后续在仓库 Secrets 中配置签名材料。

---

## 隐私 / Privacy

- 所有图片读取、EXIF 解析与写入、ZIP 打包都在你设备的浏览器或 App 内完成。
- 没有 Analytics、没有上传 API、没有调用任何第三方服务器。
- Web 版由 GitHub Pages 静态托管；APK 版完全离线运行。

---

## 许可证 / License

[GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0)。

---

## 贡献 / Contributing

欢迎提 Issue 反馈 Bug 或建议功能；PR 请基于 `main` 分支提交。提交前请确保：

- `npm run dev` 与 `npm run build -- --mode web` 本地都能成功。
- 不引入新的运行时网络请求（保持纯客户端）。
