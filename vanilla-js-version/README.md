# 原生 JavaScript PDF 预览器

纯 JavaScript 实现的 PDF 预览插件，无需任何框架依赖。

## 🚀 快速开始

### 方式一：直接打开 HTML 文件

```bash
# 直接用浏览器打开
open example/index.html  # macOS
start example/index.html # Windows
```

### 方式二：使用本地服务器

```bash
# 安装依赖
npm install

# 启动服务器
npm run dev
```

## 📖 使用方法

### 基础用法

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="pdf-viewer.css" />
  </head>
  <body>
    <div id="pdf-viewer"></div>

    <script type="module">
      import PdfViewer from "./pdf-viewer.js";

      const viewer = new PdfViewer({
        container: "#pdf-viewer",
        url: "path/to/your.pdf",
      });
    </script>
  </body>
</html>
```

### 配置选项

```javascript
const viewer = new PdfViewer({
  // 必需：容器元素或选择器
  container: "#pdf-viewer",

  // 必需：PDF文件URL
  url: "document.pdf",

  // 可选：初始缩放比例（默认：1.5）
  scale: 1.5,

  // 可选：加载成功回调
  onLoad: (numPages) => {
    console.log(`PDF已加载，共${numPages}页`);
  },

  // 可选：加载失败回调
  onError: (error) => {
    console.error("加载失败", error);
  },

  // 可选：页面切换回调
  onPageChange: (pageNum) => {
    console.log(`当前第${pageNum}页`);
  },
});
```

### API 方法

```javascript
// 页面导航
viewer.nextPage(); // 下一页
viewer.previousPage(); // 上一页
viewer.jumpToPage(5); // 跳转到第5页

// 缩放控制
viewer.zoomIn(); // 放大
viewer.zoomOut(); // 缩小
viewer.resetZoom(); // 重置缩放

// 旋转
viewer.rotateLeft(); // 逆时针旋转90°
viewer.rotateRight(); // 顺时针旋转90°

// 缩略图
viewer.toggleThumbnails(); // 切换缩略图显示

// 销毁实例
viewer.destroy(); // 清理资源
```

## ⌨️ 键盘快捷键

- `←` / `→` - 上一页 / 下一页
- `+` / `-` - 放大 / 缩小
- `0` - 重置缩放
- `Enter` - 跳转到输入的页码

## 🎨 自定义样式

你可以通过覆盖 CSS 变量来自定义样式：

```css
.pdf-viewer {
  --toolbar-bg: #323639;
  --toolbar-color: white;
  --button-bg: #464a4d;
  --button-hover-bg: #5a5e61;
  --primary-color: #667eea;
}
```

## 📦 文件结构

```
vanilla-js-version/
├── src/
│   ├── pdf-viewer.js      # 核心插件代码
│   └── pdf-viewer.css     # 样式文件
├── example/
│   └── index.html         # 使用示例
├── package.json
└── README.md
```

## 🌟 特性

- ✅ 零依赖（除了 PDF.js）
- ✅ 轻量级
- ✅ 易于集成
- ✅ 完整的 API
- ✅ 响应式设计
- ✅ 现代化 UI

## 📝 浏览器兼容性

- Chrome/Edge (最新版本)
- Firefox (最新版本)
- Safari (最新版本)

## 📄 License

MIT
