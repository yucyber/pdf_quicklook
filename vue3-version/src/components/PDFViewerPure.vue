<template>
  <!-- 用卡片容器包裹整个组件 -->
  <div class="pdf-viewer-card">
  <!-- 文件选择区 -->
  <div class="file-selector-card">
      <button @click="triggerFileSelect" class="custom-file-btn">
        选择PDF文件
        <input 
          type="file" 
          accept=".pdf" 
          class="file-input" 
          ref="fileInput"
          @change="onFileChange"
        >
      </button>
      <p v-if="selectedFileName" class="selected-file-name">{{ selectedFileName }}</p>
    </div>

    <!-- 功能控制区 -->
    <div class="control-panel-card" v-if="pdfDoc">
      <!-- 页面切换组 -->
      <div class="control-group">
        <button 
          @click="goToPrevPage" 
          :disabled="currentPage === 1 || isLoading" 
          class="control-btn"
        >
          上一页
        </button>
        <span class="control-info">
          第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
        </span>
        <button 
          @click="goToNextPage" 
          :disabled="currentPage === totalPages || isLoading" 
          class="control-btn"
        >
          下一页
        </button>
      </div>

      <!-- 旋转组 -->
      <div class="control-group">
        <button 
          @click="rotateCounterClockwise" 
          :disabled="isLoading" 
          class="control-btn"
        >
          ↺ 逆时针旋转
        </button>
        <span class="control-info">
          旋转: {{ rotation }}°
        </span>
        <button 
          @click="rotateClockwise" 
          :disabled="isLoading" 
          class="control-btn"
        >
          ↻ 顺时针旋转
        </button>
      </div>

      <!-- 缩放组 -->
      <div class="control-group">
        <button 
          @click="zoomOut" 
          :disabled="scale <= 0.2 || isLoading" 
          class="control-btn"
        >
          缩小
        </button>
        <span class="control-info">
          缩放: {{ (scale * 100).toFixed(0) }}%
        </span>
        <button 
          @click="zoomIn" 
          :disabled="scale >= 5.0 || isLoading" 
          class="control-btn"
        >
          放大
        </button>
        <button 
          @click="toggleThumbnails" 
          :disabled="isLoading" 
          class="control-btn"
        >
          {{ showThumbnails ? '隐藏缩略图' : '显示缩略图' }}
        </button>
      </div>
    </div>

    <!-- PDF渲染区 -->
    <div class="render-area-card">
      <div v-if="isLoading" class="loading-animation">
        <!-- 自定义加载动画 -->
        <div class="loader-circle"></div>
        <p>加载中...</p>
      </div>
      <div v-else class="pdf-container-wrapper">
        <!-- 缩略图侧边栏 -->
        <div v-if="showThumbnails && pdfDoc" class="thumbnails-sidebar">
          <div class="thumbnails-container">
            <div 
              v-for="pageNum in totalPages" 
              :key="pageNum"
              class="thumbnail-item"
              :class="{ 'active': currentPage === pageNum }"
              @click="goToPage(pageNum)"
            >
              <canvas 
                :ref="el => thumbnailRefs[pageNum] = el" 
                class="thumbnail-canvas"
              ></canvas>
              <span class="thumbnail-page-number">{{ pageNum }}</span>
            </div>
          </div>
        </div>
        
        <!-- PDF主渲染区 -->
        <div class="pdf-scroll-container" :class="{ 'with-thumbnails': showThumbnails }">
          <div class="render-area">
            <canvas 
              ref="pdfCanvas" 
              class="pdf-canvas" 
              v-if="pdfDoc"
            ></canvas>
            <p v-if="errorMsg" class="error-message">{{ errorMsg }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

// 配置Worker，使用相对路径方式
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.js';

// 状态管理
const pdfCanvas = ref(null);
const fileInput = ref(null);
const isLoading = ref(false);
const selectedFileName = ref('');
const errorMsg = ref('');
let pdfDoc = null;

// 新增响应式状态
const currentPage = ref(1);
const totalPages = ref(0);
const rotation = ref(0);
const scale = ref(1.0);
// 缩略图相关状态
const showThumbnails = ref(false);
const thumbnailRefs = ref({});
const thumbnailScale = 0.15; // 缩略图缩放比例

// 触发文件选择
const triggerFileSelect = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

// 处理文件选择
const onFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    isLoading.value = true;
    errorMsg.value = '';
    selectedFileName.value = file.name;
    console.log('开始加载PDF文件:', file.name);
    
    // 重置状态
    currentPage.value = 1;
    rotation.value = 0;
    scale.value = 1.0;
    
    // 读取文件为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    // 仅使用公开API加载PDF文档
    pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
    console.log('PDF加载成功，页数:', pdfDoc.numPages);
    
    // 设置总页数
    totalPages.value = pdfDoc.numPages;
    
    // 重要：设置isLoading为false，让Canvas渲染到DOM
    isLoading.value = false;
    
    // 确保Canvas DOM完全就绪后再渲染
    await nextTick();
    await nextTick(); // 双重nextTick确保DOM完全更新
    
    // 此时Canvas应该已经存在于DOM中，执行渲染
    await performRender();
  } catch (error) {
    console.error('PDF加载失败:', error);
    errorMsg.value = `加载失败: ${error.message}`;
    isLoading.value = false;
  } finally {
    // 清空input以允许重新选择同一个文件
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

// 页面切换 - 上一页
const goToPrevPage = async () => {
  if (currentPage.value > 1 && !isLoading.value) {
    currentPage.value--;
    await performRender();
  }
};

// 页面切换 - 下一页
const goToNextPage = async () => {
  if (currentPage.value < totalPages.value && !isLoading.value) {
    currentPage.value++;
    await performRender();
  }
};

// 旋转 - 顺时针
const rotateClockwise = async () => {
  if (!isLoading.value) {
    rotation.value = (rotation.value + 90) % 360;
    await performRender();
  }
};

// 旋转 - 逆时针
const rotateCounterClockwise = async () => {
  if (!isLoading.value) {
    rotation.value = (rotation.value - 90 + 360) % 360;
    await performRender();
  }
};

// 缩放 - 放大
const zoomIn = async () => {
  if (scale.value < 5.0 && !isLoading.value) {
    // 增加缩放步进，使缩放更明显
    scale.value = Math.min(5.0, scale.value + 0.25);
    await performRender();
  }
};

// 切换缩略图显示
const toggleThumbnails = async () => {
  if (isLoading.value) return;
  
  showThumbnails.value = !showThumbnails.value;
  
  // 如果显示缩略图，则生成所有缩略图
  if (showThumbnails.value && pdfDoc) {
    await generateThumbnails();
  }
};

// 跳转到指定页面
const goToPage = async (pageNum) => {
  if (pageNum < 1 || pageNum > totalPages.value || isLoading.value) return;
  
  currentPage.value = pageNum;
  await performRender();
};

// 生成所有页面的缩略图
const generateThumbnails = async () => {
  try {
    // 等待DOM更新，确保缩略图画布已创建
    await nextTick();
    
    // 为每个页面生成缩略图
    for (let i = 1; i <= totalPages.value; i++) {
      const thumbnailCanvas = thumbnailRefs.value[i];
      if (thumbnailCanvas) {
        await renderThumbnail(i, thumbnailCanvas);
      }
    }
  } catch (error) {
    console.error('生成缩略图失败:', error);
  }
};

// 渲染单个缩略图
const renderThumbnail = async (pageNum, canvas) => {
  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: thumbnailScale });
    
    // 设置缩略图画布尺寸
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d');
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
  } catch (error) {
    console.error(`渲染缩略图第${pageNum}页失败:`, error);
  }
};

// 监听页面变化，高亮当前页缩略图
watch(currentPage, async () => {
  if (showThumbnails.value) {
    // 如果当前页的缩略图还没生成，则生成它
    const thumbnailCanvas = thumbnailRefs.value[currentPage.value];
    if (thumbnailCanvas && thumbnailCanvas.width === 0) {
      await renderThumbnail(currentPage.value, thumbnailCanvas);
    }
  }
});

// 缩放 - 缩小
const zoomOut = async () => {
  if (scale.value > 0.1 && !isLoading.value) {
    // 降低最小缩放限制，使缩小范围更大
    scale.value = Math.max(0.1, scale.value - 0.25);
    await performRender();
  }
};

// 统一的渲染执行函数，确保渲染时机正确
const performRender = async () => {
  try {
    // 重要：先不设置加载状态，让Canvas保持显示
    
    // 确保DOM更新后再渲染
    await nextTick();
    await nextTick(); // 双重nextTick确保DOM完全更新
    
    // 在渲染前检查Canvas是否存在
    if (!pdfCanvas.value) {
      console.error('Canvas元素未找到');
      errorMsg.value = 'Canvas元素未找到，请刷新页面重试';
      return;
    }
    
    // 执行实际渲染
    await renderPage(currentPage.value);
  } catch (error) {
    console.error('渲染执行失败:', error);
    errorMsg.value = `渲染失败: ${error.message}`;
  } finally {
    // 渲染完成后可以处理加载状态
  }
};

// 渲染页面 - 结合旋转和缩放，优化清晰度
const renderPage = async (pageNumToRender) => {
  try {
    // 确保Canvas存在和pdfDoc已加载
    if (!pdfCanvas.value || !pdfDoc) {
      console.error('Canvas元素未找到或PDF文档未加载');
      return;
    }
    
    // 仅使用公开API获取页面
    const page = await pdfDoc.getPage(pageNumToRender);
    
    // 获取设备像素比，用于高清渲染
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // 结合旋转和缩放生成视口
    const viewport = page.getViewport({
      scale: scale.value,
      rotation: rotation.value
    });
    
    // 确认Canvas引用
    const ctxCanvas = pdfCanvas.value;
    
    // 安全地获取Context
    const context = ctxCanvas.getContext('2d');
    if (!context) {
      console.error('无法获取Canvas上下文');
      errorMsg.value = '无法创建Canvas上下文，请刷新页面重试';
      return;
    }
    
    // 关键：根据设备像素比和缩放比例设置Canvas实际尺寸（像素）
    // 这是实现清晰缩放的核心 - 缩放时直接修改Canvas的实际像素大小
    ctxCanvas.width = viewport.width * devicePixelRatio;
    ctxCanvas.height = viewport.height * devicePixelRatio;
    
    // 设置Canvas的CSS尺寸，确保显示大小正确
    // 不使用百分比，而是使用实际像素值，避免浏览器额外缩放导致的模糊
    ctxCanvas.style.width = `${viewport.width}px`;
    ctxCanvas.style.height = `${viewport.height}px`;
    
    // 设置上下文比例，确保高清渲染
    context.scale(devicePixelRatio, devicePixelRatio);
    
    // 清空画布
    context.clearRect(0, 0, viewport.width, viewport.height);

    // 优化渲染参数，提高渲染质量
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      // 启用WebGL渲染以提高性能（如果浏览器支持）
      enableWebGL: true,
      // 禁用某些功能以提高性能
      renderInteractiveForms: false,
      // 为屏幕显示优化
      intent: 'display'
    };
    
    // 执行渲染并等待完成
    const renderTask = page.render(renderContext);
    
    // 渲染进度回调（如果需要）
    renderTask.onProgress = ({ loaded, total }) => {
      // 可以在这里实现渲染进度指示器
    };
    
    await renderTask.promise;
    
    console.log('页面渲染完成:', pageNumToRender, '缩放:', scale.value, '旋转:', rotation.value);
    console.log('Canvas实际尺寸(包含DPR):', ctxCanvas.width, ctxCanvas.height);
    console.log('Canvas CSS尺寸:', ctxCanvas.style.width, ctxCanvas.style.height);
  } catch (error) {
    console.error('页面渲染失败:', error);
    errorMsg.value = `渲染失败: ${error.message}`;
    throw error;
  }
};

// 组件挂载后确保Canvas已准备就绪
onMounted(async () => {
  await nextTick();
  console.log('PDF组件已挂载');
  // 如果PDF已在挂载前加载完成，尝试渲染
  if (pdfDoc) {
    await nextTick();
    await nextTick(); // 双重nextTick确保DOM完全更新
    console.log('挂载后尝试渲染，pdfCanvas.value:', pdfCanvas.value);
    if (pdfCanvas.value) {
      await performRender();
    }
  }
});
</script>

<style scoped>
/* 全局卡片样式 */
.pdf-viewer-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  box-sizing: border-box;
  margin: 0 auto;
  max-width: none;
  width: 100%;
}

/* 文件选择区 */
.file-selector-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  padding: 20px;
  text-align: center;
  max-width: 1200px;
  margin: 0 auto;
}

.custom-file-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: #6a5acd;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.custom-file-btn:hover {
  background: #5a4aca;
  box-shadow: 0 2px 8px rgba(106, 90, 205, 0.3);
  transform: translateY(-2px);
}

.custom-file-btn:active {
  transform: scale(0.98);
}

.file-input {
  display: none;
}

.selected-file-name {
  margin-top: 10px;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

/* 功能控制区 */
.control-panel-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  padding: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
  max-width: 1200px;
  margin: 0 auto;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f9f9f9;
  padding: 12px 16px;
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.control-btn {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background: #6a5acd;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.control-btn:hover:not(:disabled) {
  background: #5a4aca;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(106, 90, 205, 0.3);
}

.control-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.control-info {
  color: #333;
  min-width: 120px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  background: #e6e0ff;
  padding: 6px 12px;
  border-radius: 4px;
}

/* 渲染区 */
.render-area-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  padding: 0;
  overflow: hidden;
  min-height: 700px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.pdf-container-wrapper {
  display: flex;
  height: 100%;
  min-height: 500px;
}

/* 缩略图侧边栏样式 */
.thumbnails-sidebar {
  width: 180px;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  flex-shrink: 0;
}

.thumbnails-container {
  padding: 10px;
}

.thumbnail-item {
  margin-bottom: 10px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  padding: 5px;
  transition: all 0.2s ease;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.thumbnail-item:hover {
  border-color: #6a5acd;
  box-shadow: 0 2px 8px rgba(106, 90, 205, 0.2);
  transform: translateY(-1px);
}

.thumbnail-item.active {
  border-color: #6a5acd;
  background: #f0e6ff;
}

.thumbnail-canvas {
  width: 100%;
  height: auto;
  border-radius: 2px;
  display: block;
}

.thumbnail-page-number {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  font-weight: 500;
}

/* PDF主渲染区样式 */
.pdf-scroll-container {
  flex: 1;
  max-height: 800px;
  overflow: auto;
  transition: all 0.3s ease;
}

.pdf-scroll-container.with-thumbnails {
  max-height: calc(800px - 20px);
}

.render-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: 20px;
  min-height: 400px;
  justify-content: center;
}

.loading-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50px 0;
  min-height: 400px;
  justify-content: center;
}

.loader-circle {
  width: 40px;
  height: 40px;
  border: 4px solid #e6e0ff;
  border-top: 4px solid #6a5acd;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
  box-shadow: 0 0 10px rgba(106, 90, 205, 0.2);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.pdf-canvas {
    border: 1px solid #eee;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: block;
    transition: opacity 0.3s ease;
    max-width: 100%;
    height: auto;
    min-width: auto;
    /* 关键：优化图像渲染质量 */
    image-rendering: optimizeQuality;
    /* 在WebKit浏览器中优化 */
    -webkit-backface-visibility: hidden;
    -webkit-transform: translateZ(0);
  }

.pdf-canvas[v-show="false"] {
  opacity: 0;
}

.pdf-canvas[v-show="true"] {
  opacity: 1;
}

.error-message {
  color: #e53e3e;
  padding: 50px 20px;
  text-align: center;
  font-size: 14px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 4px;
  margin: 20px;
  max-width: 600px;
}

/* 桌面端优化 */
@media (min-width: 1200px) {
  .render-area-card {
    min-height: 800px;
  }
  
  .pdf-canvas {
    min-width: 700px;
  }
  
  .thumbnails-sidebar {
    width: 220px;
  }
}

/* 平板端适配 */
@media (max-width: 1199px) and (min-width: 769px) {
  .pdf-viewer-card {
    padding: 15px;
  }
  
  .pdf-canvas {
    min-width: 500px;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .pdf-viewer-card {
    margin: 0;
    padding: 10px;
  }
  
  .file-selector-card,
  .control-panel-card,
  .render-area-card {
    padding: 15px;
  }
  
  .control-panel-card {
    flex-direction: column;
    align-items: stretch;
  }
  
  .control-group {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .control-info {
    min-width: 100px;
    font-size: 13px;
  }
  
  .control-btn {
    padding: 7px 12px;
    font-size: 13px;
  }
  
  .render-area {
    padding: 10px;
    min-height: 300px;
  }
  
  .pdf-scroll-container {
    max-height: 600px;
  }
  
  /* 移动端缩略图样式调整 */
  .thumbnails-sidebar {
    width: 120px;
  }
  
  .thumbnail-item {
    margin-bottom: 8px;
    padding: 4px;
  }
  
  .thumbnail-page-number {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .control-group {
    flex-direction: column;
    gap: 8px;
  }
  
  .custom-file-btn {
    width: 100%;
    padding: 12px;
  }
  
  .loader-circle {
    width: 30px;
    height: 30px;
    border-width: 3px;
  }
  
  /* 移动端缩略图进一步调整 */
  .pdf-container-wrapper {
    flex-direction: column;
  }
  
  .thumbnails-sidebar {
    width: 100%;
    height: 120px;
    border-right: none;
    border-bottom: 1px solid #e9ecef;
    overflow-x: auto;
    overflow-y: hidden;
  }
  
  .thumbnails-container {
    display: flex;
    gap: 10px;
    padding: 10px;
  }
  
  .thumbnail-item {
    flex-shrink: 0;
    width: 80px;
    margin-bottom: 0;
  }
}
</style>