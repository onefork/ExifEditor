# EXIF Debug Samples

用于调试/回归测试的图片样张存放目录。

## 目录用途

- 放 **真实的问题图片**(会触发 piexifjs 解析错误的 jpeg / 带有特殊 EXIF 子段的图片)
- 放 **边界样例**(无 EXIF、仅 GPS、超大/特殊取向 HEIC 转存的 jpeg 等)
- 放 **预设对照**(一组已知 EXIF 值的 jpeg,例如 GPS 明确在故宫、时间固定为 2025-01-01 12:00:00)

## 使用方式

1. 直接拖拽/点击页面顶部的「选择图片」按钮,从本目录选择若干图片。
2. 页面顶部会显示每张图片的文件名 + 摘要信息(大小 / 尺寸 / 时间 / GPS / 设备)。
3. 若解析失败,文件名下方会出现一条红色错误文案,包含 `piexifjs` 抛出的原始错误信息,便于排查。
4. 编辑 GPS / 时间 / 设备后,点「批量导出 ZIP」或「逐张下载」把修改后的图片存回本地,用任意 EXIF 检视工具(例如 ExifTool、Windows 属性→「详细信息」)交叉验证写入结果。

## 建议的样片子集

```
debug-samples/
  ├── good/                     正常 JPEG
  │   ├── phone-with-gps.jpg
  │   └── camera-flash.jpg
  ├── edge/                     边界情况
  │   ├── no-exif.jpg           完全没有 EXIF
  │   ├── no-gps.jpg            有 EXIF 但无 GPS
  │   ├── orientation-3.jpg     旋转元数据
  │   └── huge-exif.jpg         APP1 段很大
  └── broken/                   会触发解析错误 / 之前失败过的样本
      ├── non-jpeg-pretend.jpg
      └── known-bad-payload.jpg
```

## 提示

- **图片不提交到 git**。如需要给他人复现,请另外提供下载地址或通过文件传输。
- 建议文件名包含「问题类型」,便于快速定位,例如 `broken_ieft_orientation-tag.jpg`。
