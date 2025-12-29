<template>
  <div class="virtual-pdf-viewer">
    <div v-if="!url && !localUrl" class="file-upload-container">
      <label class="upload-btn">
        选择 PDF 文件测试虚拟滚动
        <input type="file" accept=".pdf" @change="handleFileChange" />
      </label>
    </div>

    <div v-else class="pdf-container" ref="containerRef" @scroll="handleScroll">
      <div v-if="loading" class="global-loading">
        <div class="spinner"></div>
        <p>正在解析 PDF 结构...</p>
      </div>

      <div class="pdf-list-wrapper" :style="{ height: totalHeight + 'px' }">
        <!-- 
          核心逻辑：
          1. 遍历所有页面，但只渲染 visiblePages 里的页面
          2. 使用 absolute 定位，根据 translateY 放到正确的位置
        -->
        <div v-for="page in visiblePages" :key="page.pageNumber" class="pdf-page-holder" :style="{
          transform: `translate(-50%, ${page.top}px)`,
          width: page.width + 'px',
          height: page.height + 'px'
        }">
          <canvas :ref="(el) => setCanvasRef(el, page.pageNumber)"></canvas>
          <!-- 加载状态占位 -->
          <div v-if="!page.rendered" class="loading-placeholder">
            <div class="spinner"></div>
            Loading Page {{ page.pageNumber }}...
          </div>
          <div class="page-number">Page {{ page.pageNumber }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, shallowRef, watch, onUnmounted, nextTick } from 'vue';
import * as pdfjsLib from 'pdfjs-dist';

// 移除手动 Worker 配置，沿用 main.js 中的全局配置
// 如果 main.js 没配置好，这里可以作为兜底，但优先信任全局配置
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  console.warn('Worker source not set, falling back to CDN');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

const props = defineProps({ url: String });
const localUrl = ref(null);

const containerRef = ref(null);
const pdfDoc = shallowRef(null);
const pagesMetaData = ref([]); // 存储每一页的高度、宽度、top位置
const scrollTop = ref(0);
const containerHeight = ref(0);
const loading = ref(false);

// 核心配置
const BUFFER = 1; // 缓冲区大小 (视口高度的倍数)
// 存储渲染任务，用于取消
const renderTasks = new Map();

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    localUrl.value = URL.createObjectURL(file);
    initPDF(localUrl.value);
  }
};

// 1. 初始化 PDF
const initPDF = async (pdfUrl) => {
  console.log('🚀 [Debug] 开始初始化 PDF:', pdfUrl);
  console.log('🚀 [Debug] 当前 Worker 路径:', pdfjsLib.GlobalWorkerOptions.workerSrc);

  if (!pdfUrl) return;

  try {
    loading.value = true;
    // 清理旧数据
    pagesMetaData.value = [];
    scrollTop.value = 0;

    console.log('🚀 [Debug] 正在加载文档...');
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    pdfDoc.value = await loadingTask.promise;
    console.log('🚀 [Debug] 文档加载成功, 总页数:', pdfDoc.value.numPages);

    let currentTop = 0;
    const metaData = [];

    // 预获取每一页的视口信息
    // 优化：先获取第一页高度，假设所有页面高度一致，快速渲染，后续再修正
    // 这里为了准确性，还是遍历获取，但对于大文件可能需要优化
    for (let i = 1; i <= pdfDoc.value.numPages; i++) {
      const page = await pdfDoc.value.getPage(i);
      // 使用 1.5 倍缩放，提高清晰度
      const viewport = page.getViewport({ scale: 1.5 });

      metaData.push({
        pageNumber: i,
        width: viewport.width,
        height: viewport.height,
        top: currentTop,
        viewport: viewport,
        rendered: false,
        rendering: false
      });

      currentTop += viewport.height + 20; // 20px 间距
    }

    pagesMetaData.value = metaData;
    console.log('🚀 [Debug] 元数据生成完毕, 页面总高度:', currentTop);

    // 确保容器高度已更新
    await nextTick();
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight;
      console.log('🚀 [Debug] 容器高度:', containerHeight.value);
    } else {
      console.error('❌ [Debug] 容器 ref 不存在!');
    }

  } catch (error) {
    console.error('❌ [Debug] Error loading PDF:', error);
    alert('PDF 加载失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 2. 计算总高度
const totalHeight = computed(() => {
  if (pagesMetaData.value.length === 0) return 0;
  const lastPage = pagesMetaData.value[pagesMetaData.value.length - 1];
  return lastPage ? lastPage.top + lastPage.height + 50 : 0;
});

// 3. 核心算法：计算当前视口应该显示哪些页面
const visiblePages = computed(() => {
  if (pagesMetaData.value.length === 0) return [];

  // 增加缓冲区，提前渲染
  const bufferHeight = containerHeight.value * BUFFER;
  const startY = scrollTop.value - bufferHeight;
  const endY = scrollTop.value + containerHeight.value + bufferHeight;

  const visible = pagesMetaData.value.filter(page => {
    const pageBottom = page.top + page.height;
    return pageBottom > startY && page.top < endY;
  });

  // 调试日志：仅当可见页面变化时打印，避免刷屏
  // console.log(`🚀 [Debug] 可见页面: ${visible.map(p => p.pageNumber).join(',')}`);
  return visible;
});

// 4. 滚动监听 (使用 requestAnimationFrame 优化)
let ticking = false;
const handleScroll = (e) => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      if (e.target) {
        scrollTop.value = e.target.scrollTop;
        // 动态更新容器高度，防止窗口 resize 导致计算不准
        containerHeight.value = e.target.clientHeight;
      }
      ticking = false;
    });
    ticking = true;
  }
};

// 5. 渲染 Canvas
const setCanvasRef = (el, pageNumber) => {
  if (!el) return;

  // 关键修复：如果 Canvas 已经渲染过且属于当前页面，直接跳过
  // 这能完美解决滚动时的闪烁问题
  if (el.getAttribute('data-rendered') === 'true' && el.getAttribute('data-page') === String(pageNumber)) {
    return;
  }

  renderPage(pageNumber, el);
};

const renderPage = async (pageNumber, canvas) => {
  const pageMeta = pagesMetaData.value.find(p => p.pageNumber === pageNumber);
  if (!pageMeta) return;

  // 双重保险：检查 Canvas 标记
  if (canvas.getAttribute('data-rendered') === 'true' && canvas.getAttribute('data-page') === String(pageNumber)) {
    return;
  }

  if (pageMeta.rendering) return;

  try {
    pageMeta.rendering = true;
    const page = await pdfDoc.value.getPage(pageNumber);
    const context = canvas.getContext('2d');

    // 只有尺寸不对时才重置，防止闪烁
    if (canvas.width !== pageMeta.width || canvas.height !== pageMeta.height) {
      canvas.width = pageMeta.width;
      canvas.height = pageMeta.height;
    }

    const renderContext = {
      canvasContext: context,
      viewport: pageMeta.viewport
    };

    const renderTask = page.render(renderContext);
    renderTasks.set(pageNumber, renderTask);

    await renderTask.promise;

    // 标记该 Canvas 已完成渲染，并绑定页码
    canvas.setAttribute('data-rendered', 'true');
    canvas.setAttribute('data-page', String(pageNumber));

    pageMeta.rendered = true;
    renderTasks.delete(pageNumber);
  } catch (e) {
    if (e.name !== 'RenderingCancelledException') {
      console.error(`Page ${pageNumber} error:`, e);
    }
  } finally {
    pageMeta.rendering = false;
  }
};

// 组件卸载时取消所有渲染任务
onUnmounted(() => {
  renderTasks.forEach(task => task.cancel());
  renderTasks.clear();
});

onMounted(() => {
  if (props.url) {
    initPDF(props.url);
  }
});

watch(() => props.url, (newUrl) => {
  if (newUrl) initPDF(newUrl);
});
</script>

<style scoped>
.virtual-pdf-viewer {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.file-upload-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: #f0f2f5;
}

.upload-btn {
  padding: 12px 24px;
  background: #1890ff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.upload-btn:hover {
  background: #40a9ff;
}

.upload-btn input {
  display: none;
}

.global-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 100;
  background: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pdf-container {
  flex: 1;
  overflow-y: auto;
  background: #e6e6e6;
  position: relative;
  height: 100%;
  /* 确保高度撑满 */
}

.pdf-list-wrapper {
  position: relative;
  /* 关键：用于子元素绝对定位 */
  margin: 0 auto;
  max-width: 900px;
}

.pdf-page-holder {
  position: absolute;
  /* 关键：脱离文档流，由 top 属性控制位置 */
  left: 50%;
  /* transform: translateX(-50%);  Moved to inline style to combine with translateY */
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #fff;
  color: #999;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.page-number {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
</style>