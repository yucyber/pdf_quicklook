# PDF 预览插件

一个功能完善的 PDF 预览插件，提供 Vue3 组件版本和原生 JavaScript 版本。

## 🎯 项目亮点

- ✅ 支持 Vue3 组件化封装
- ✅ 提供原生 JavaScript 版本
- ✅ 完整的 PDF 预览功能
- ✅ 响应式设计，支持移动端
- ✅ 丰富的交互功能（缩放、旋转、跳转）

## 📁 项目结构

```
pdf预览插件/
├── .gitignore                      # Git忽略配置
├── .vscode/                        # VS Code配置
│   └── settings.json              # VS Code设置
├── README.md                      # 项目概述
├── START_HERE.md                  # 入门指南
├── Vue3_PDF预览组件修复总结.md    # Vue3组件修复总结
├── 实施指南.md                    # 详细的开发指南
├── 快速开始.md                    # 5分钟快速启动指南
├── 项目亮点总结.md                # 面试准备材料
├── 项目总览.md                    # 项目总览文档
│
├── vue3-version/                  # Vue3版本
│   ├── src/
│   │   ├── components/            # PDF预览组件
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── dist/                      # 构建输出目录
│
└── vanilla-js-version/            # 原生JS版本
    ├── src/
    │   ├── pdf-viewer.js          # 核心插件代码
    │   └── pdf-viewer.css         # 样式文件
    ├── example/
    │   └── index.html             # 示例页面
    └── package.json
```

## 🚀 快速开始

### Vue3 版本

```bash
cd vue3-version
npm install
npm run dev
```

### 原生 JS 版本

```bash
cd vanilla-js-version
# 直接打开 example/index.html 或使用本地服务器
npx serve example
```

## 📚 技术栈

- **核心库**: PDF.js (Mozilla 开源 PDF 渲染引擎)
- **Vue 版本**: Vue 3 + Vite
- **原生版本**: ES6+ JavaScript
- **样式**: CSS3 + Flexbox

## 🎨 功能特性

### 基础功能

- [x] PDF 文件加载
- [x] 页面渲染
- [x] 翻页控制
- [x] 页码显示

### 高级功能

- [x] 高清缩放控制（任意缩放级别保持清晰显示，支持设备像素比适配）
- [x] 页面旋转（90° 旋转）
- [x] 页面跳转
- [x] 缩略图导航
- [x] 全屏模式
- [x] 搜索文本（可选扩展）
- [x] 下载功能
- [x] 高分辨率显示器优化

## 💡 学习要点

通过这个项目，你可以学到：

1. **Vue3 核心概念**

   - Composition API（ref, reactive, computed, watch）
   - 组件封装与复用
   - Props 和 Emits
   - 生命周期钩子

2. **JavaScript 进阶**

   - Canvas API 使用
   - Promise 异步编程
   - ES6+特性（解构、箭头函数、模块化）
   - 事件处理与委托

3. **工程化实践**

   - Vite 构建工具
   - npm 包管理
   - 模块化开发

4. **用户体验**
   - 响应式设计
   - 交互设计
   - 性能优化（懒加载、虚拟滚动）

## 📖 使用示例

### Vue3 组件使用

```vue
<template>
  <PdfViewer :url="pdfUrl" />
</template>

<script setup>
import { ref } from "vue";
import PdfViewer from "./components/PdfViewer.vue";

const pdfUrl = ref("/sample.pdf");
</script>
```

### 原生 JS 使用

```javascript
import PdfViewer from "./pdf-viewer.js";

const viewer = new PdfViewer({
  container: "#pdf-container",
  url: "/sample.pdf",
});
```

## 🎯 面试加分点

1. **技术深度**: 理解 PDF.js 工作原理，Canvas 渲染机制
2. **代码质量**: 模块化、可维护、有注释
3. **用户体验**: 流畅的交互、友好的提示
4. **扩展性**: 支持配置、事件回调、插件机制
5. **性能优化**: 大文件处理、懒加载、缓存策略

## 📝 后续优化方向

- [ ] 添加水印功能
- [ ] 支持 PDF 表单填写
- [ ] 添加注释和标注功能
- [ ] 支持 PDF 分片加载（大文件优化）
- [ ] 添加快捷键支持
- [ ] 多语言支持

## 详细文档

- 完整项目说明请查看 <mcfile name="项目总览.md" path="项目总览.md"></mcfile>
- 快速开始指南请查看 <mcfile name="快速开始.md" path="快速开始.md"></mcfile>
- 实施指南请查看 <mcfile name="实施指南.md" path="实施指南.md"></mcfile>
- 项目亮点总结请查看 <mcfile name="项目亮点总结.md" path="项目亮点总结.md"></mcfile>
- 组件修复详情请查看 <mcfile name="Vue3_PDF预览组件修复总结.md" path="Vue3_PDF预览组件修复总结.md"></mcfile>

## 📄 License

MIT

---

**作者**: 前端开发学习者
**用途**: 学习交流、求职作品展示
