# Vue3 PDF 预览器

基于 Vue 3 和 Composition API 开发的现代化 PDF 预览组件。

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📖 组件使用

### 基础用法

```vue
<template>
  <PdfViewer :url="pdfUrl" />
</template>

<script setup>
import { ref } from "vue";
import PdfViewer from "./components/PdfViewer.vue";

const pdfUrl = ref("path/to/your.pdf");
</script>
```

### Props

| 属性 | 类型   | 必需 | 默认值 | 说明           |
| ---- | ------ | ---- | ------ | -------------- |
| url  | String | 是   | -      | PDF 文件的 URL |

### Events

| 事件名      | 参数               | 说明               |
| ----------- | ------------------ | ------------------ |
| loaded      | (numPages: number) | PDF 加载成功时触发 |
| error       | (error: Error)     | PDF 加载失败时触发 |
| page-change | (pageNum: number)  | 页码改变时触发     |

### 完整示例

```vue
<template>
  <div>
    <PdfViewer
      :url="pdfUrl"
      @loaded="handleLoaded"
      @error="handleError"
      @page-change="handlePageChange"
    />
  </div>
</template>

<script setup>
import { ref } from "vue";
import PdfViewer from "./components/PdfViewer.vue";

const pdfUrl = ref("/documents/sample.pdf");

const handleLoaded = (numPages) => {
  console.log(`PDF 已加载，共 ${numPages} 页`);
};

const handleError = (error) => {
  console.error("PDF 加载失败:", error);
  alert("无法加载 PDF 文件");
};

const handlePageChange = (pageNum) => {
  console.log(`当前页码: ${pageNum}`);
};
</script>
```

## 🎨 功能特性

### 核心功能

- ✅ PDF 文件加载与渲染
- ✅ 页面导航（上一页、下一页、跳转）
- ✅ 缩放控制（放大、缩小、适应页面）
- ✅ 页面旋转（90° 旋转）
- ✅ 缩略图导航
- ✅ 页码输入跳转

### 用户体验

- ✅ 流畅的动画效果
- ✅ 响应式设计
- ✅ 键盘快捷键支持
- ✅ 美观的现代化 UI
- ✅ 加载状态提示

### 键盘快捷键

- `←` / `→` - 上一页 / 下一页
- `+` / `-` - 放大 / 缩小
- `0` - 重置缩放
- `Enter` - 跳转到输入的页码

## 📦 项目结构

```
vue3-version/
├── src/
│   ├── components/
│   │   └── PdfViewer.vue    # PDF预览组件
│   ├── App.vue               # 主应用组件
│   ├── main.js               # 入口文件
│   └── style.css             # 全局样式
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🛠️ 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **PDF.js** - Mozilla 开源 PDF 渲染引擎
- **Composition API** - Vue 3 核心特性

## 🎯 学习要点

通过这个项目，你可以学习到：

1. **Vue 3 Composition API**

   - `ref` 和 `reactive` 响应式数据
   - `computed` 计算属性
   - `watch` 监听器
   - 生命周期钩子

2. **组件开发**

   - Props 定义和验证
   - 自定义事件（Emits）
   - 组件通信

3. **Canvas API**

   - Canvas 基础操作
   - PDF 页面渲染
   - 图形变换

4. **异步编程**
   - Promise 和 async/await
   - 错误处理
   - 加载状态管理

## 🔧 自定义配置

### 修改默认缩放

编辑 `PdfViewer.vue`：

```javascript
const scale = ref(1.5); // 修改初始缩放比例
```

### 修改端口

编辑 `vite.config.js`：

```javascript
export default defineConfig({
  server: {
    port: 3000, // 修改端口号
  },
});
```

## 📝 常见问题

### PDF.js Worker 加载失败？

确保 Worker 路径正确配置：

```javascript
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
```

### PDF 加载跨域问题？

- 确保 PDF 资源支持 CORS
- 或使用 Vite 代理配置

### 构建后 PDF.js 路径问题？

检查 `vite.config.js` 中的优化配置是否正确。

## 📄 License

MIT

---

**开发者**: 前端学习者
**用途**: 学习、作品展示
