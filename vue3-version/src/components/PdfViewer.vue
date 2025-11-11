<template>
  <div class="pdf-viewer">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-section">
        <button @click="previousPage" :disabled="currentPage <= 1" class="toolbar-btn" title="上一页">
          ◀
        </button>
        <div class="page-info">
          <input type="number" v-model.number="pageInput" @keyup.enter="jumpToPage" @blur="jumpToPage" min="1"
            :max="totalPages" class="page-input">
          <span>/ {{ totalPages }}</span>
        </div>
        <button @click="nextPage" :disabled="currentPage >= totalPages" class="toolbar-btn" title="下一页">
          ▶
        </button>
      </div>

      <div class="toolbar-section">
        <button @click="zoomOut" class="toolbar-btn" title="缩小">
          🔍-
        </button>
        <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
        <button @click="zoomIn" class="toolbar-btn" title="放大">
          🔍+
        </button>
        <button @click="resetZoom" class="toolbar-btn" title="适应页面">
          ⊡
        </button>
      </div>

      <div class="toolbar-section">
        <button @click="rotateLeft" class="toolbar-btn" title="逆时针旋转">
          ↺
        </button>
        <button @click="rotateRight" class="toolbar-btn" title="顺时针旋转">
          ↻
        </button>
        <button @click="toggleThumbnails" class="toolbar-btn" title="缩略图">
          ☰
        </button>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="viewer-container">
      <!-- 缩略图侧边栏 -->
      <div v-if="showThumbnails" class="thumbnails-sidebar">
        <div class="thumbnails-header">缩略图</div>
        <div class="thumbnails-list">
          <div v-for="page in totalPages" :key="page" @click="goToPage(page)"
            :class="['thumbnail-item', { active: page === currentPage }]" :data-page="page">
            <canvas :ref="el => setThumbnailRef(el, page)" class="thumbnail-canvas"></canvas>
            <div class="thumbnail-label">第 {{ page }} 页</div>
          </div>
        </div>
      </div>

      <!-- PDF渲染区域 -->
      <div class="pdf-container" ref="containerRef">
        <div class="loading" v-if="loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
        <div v-else-if="error" class="pdf-error">
          <p class="error-message">{{ error }}</p>
          <button class="retry-button" @click="reloadPdf">重新加载</button>
        </div>
        <div v-else class="canvas-wrapper" :style="canvasWrapperStyle">
          <canvas ref="canvasRef"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
// 直接从npm包导入pdfjs-dist，避免CDN加载问题
import * as pdfjsLib from 'pdfjs-dist'
// 注意：workerSrc已经在main.js中全局配置，这里不再重复设置
// 避免多个地方设置导致路径冲突
console.log('使用main.js中全局配置的PDF.js工作线程路径')

// 加载PDF.js库的封装函数
const loadPdfJsLibrary = async () => {
  try {
    // 验证PDF.js是否正确加载
    if (typeof pdfjsLib.getDocument !== 'function') {
      throw new Error('PDF.js加载失败：getDocument不是函数')
    }

    console.log('PDF.js从npm包成功加载')
    return pdfjsLib
  } catch (error) {
    console.error('PDF.js初始化失败:', error)
    throw error
  }
}

// 确保getDocument函数存在
const checkPdfJsAvailability = () => {
  return pdfjsLib && typeof pdfjsLib.getDocument === 'function'
}

// Props
const props = defineProps({
  url: {
    type: String,
    required: true
  },
  initialScale: {
    type: Number,
    default: 1.5,
    validator: (value) => value > 0
  },
  thumbnailCount: {
    type: Number,
    default: 5
  }
})

// Emits
const emit = defineEmits(['loaded', 'error', 'pageChanged', 'render-error'])

// 状态管理
const pdfDoc = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.5)
const rotation = ref(0)
const loading = ref(true)
const showThumbnails = ref(false)
const pageInput = ref(1)
const error = ref(null)

// 性能优化状态
const isRendering = ref(false)

// DOM引用
const canvasRef = ref(null)
const containerRef = ref(null)
const thumbnailRefs = ref({})

// 计算属性
const canvasWrapperStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
  transition: 'transform 0.3s ease'
}))

// 设置缩略图引用
const setThumbnailRef = (el, page) => {
  if (el) {
    thumbnailRefs.value[page] = el
  }
}

// PDF.js缓存清理函数已移除，避免过度清理导致的初始化问题
// 当前实现使用更稳定的PDF.js加载方式，不需要频繁重置环境

// 简化的PDF加载函数 - 避免循环加载问题
const loadPdf = async () => {
  console.log('开始加载PDF:', props.url)

  // 重置状态
  error.value = null
  loading.value = true
  pdfDoc.value = null // 确保pdfDoc为空
  currentPage.value = 1
  totalPages.value = 0
  isRendering.value = false // 重置渲染状态

  try {
    // 验证URL
    if (!props.url || typeof props.url !== 'string') {
      throw new Error('无效的PDF URL')
    }

    // 基础配置加载PDF - 极简配置避免复杂问题
    console.log('准备加载PDF文档')
    // 关键修复：移除可能导致循环的配置选项
    const loadingConfig = {
      url: props.url,
      // 移除可能触发复杂行为的配置
    }

    // 直接加载PDF文档，移除onProgress回调避免潜在的循环
    console.log('开始加载PDF内容...')
    const pdfDocObj = await pdfjsLib.getDocument(loadingConfig).promise
    pdfDoc.value = pdfDocObj
    totalPages.value = pdfDocObj.numPages
    console.log(`PDF加载成功，共${totalPages.value}页`)

    // 发出加载成功事件
    emit('loaded', totalPages.value)

    // 等待DOM更新
    await nextTick()

    // 验证canvas引用
    if (!canvasRef.value) {
      console.warn('Canvas引用未设置')
    }

    // 延迟渲染，确保DOM稳定
    setTimeout(() => {
      if (!error.value && pdfDoc.value) {
        renderPage(currentPage.value)
      }
    }, 300)

  } catch (err) {
    console.error('PDF加载失败:', err)

    // 简化的错误处理
    let errorMessage = err.message || '加载PDF失败'

    // 错误类型识别
    if (err.name === 'MissingPDFException') {
      errorMessage = 'PDF文件不存在或无法访问'
    } else if (errorMessage.includes('Failed to fetch')) {
      errorMessage = '网络错误，请检查连接'
    }

    error.value = errorMessage
    emit('error', err)
  } finally {
    loading.value = false
    console.log('PDF加载流程完成')
  }
}

// 移除旧的加载函数，使用重写的loadPdfJsLibrary函数

// 已经有reloadPdf函数，不需要重复声明

// 简化的renderPage函数，移除复杂的错误处理和队列逻辑
const renderPage = async (pageNum) => {
  try {
    // 重置渲染状态
    isRendering.value = true
    error.value = null

    // 验证pdfDoc和pageNum
    if (!pdfDoc.value || !pageNum || pageNum < 1 || pageNum > totalPages.value) {
      throw new Error('无效的页面参数')
    }

    // 获取页面
    const page = await pdfDoc.value.getPage(pageNum)

    // 等待DOM更新
    await nextTick()

    // 使用ref获取canvas元素
    const canvas = canvasRef.value
    if (!canvas) {
      throw new Error('未找到渲染画布')
    }

    // 获取上下文
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('无法获取画布上下文')
    }

    // 设置缩放比例和视口
    const viewport = page.getViewport({ scale: scale.value, rotation: rotation.value })

    // 设置画布尺寸
    canvas.width = viewport.width
    canvas.height = viewport.height

    // 设置基本样式
    canvas.style.display = 'block'
    canvas.style.backgroundColor = '#ffffff'

    // 清除画布并设置白色背景
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // 使用最简配置渲染
    const renderConfig = {
      canvasContext: context,
      viewport: viewport
    }

    // 执行渲染
    await page.render(renderConfig).promise

    // 更新当前页面
    currentPage.value = pageNum
    emit('page-change', currentPage.value)

  } catch (err) {
    console.error(`渲染页面${pageNum}失败:`, err)
    error.value = `页面 ${pageNum} 渲染失败: ${err.message}`
    emit('render-error', { pageNum, error: err })
  } finally {
    // 重置渲染状态
    isRendering.value = false
    // 移除渲染队列逻辑
  }
}

// 重新加载PDF
const reloadPdf = async () => {
  console.log('重新加载PDF...')
  // 重置状态
  pdfDoc.value = null
  currentPage.value = 1
  totalPages.value = 0
  error.value = null
  loading.value = true

  try {
    // 直接重新加载PDF，使用导入的pdfjsLib
    await loadPdf()
    console.log('PDF重新加载完成')
  } catch (reloadError) {
    console.error('PDF重新加载失败:', reloadError)
    // 确保错误状态被设置
    error.value = error.value || 'PDF重新加载失败，请检查网络连接后重试。'
  }
}

// 初始化缩略图
const initThumbnails = async () => {
  if (!pdfDoc.value || !showThumbnails.value) return

  try {
    console.log('初始化缩略图...')
    // 限制同时渲染的缩略图数量，避免性能问题
    const maxThumbnailsToRender = 5
    const startPage = Math.max(1, currentPage.value - 2)
    const endPage = Math.min(totalPages.value, startPage + maxThumbnailsToRender - 1)

    for (let i = startPage; i <= endPage; i++) {
      await renderThumbnail(i)
    }
  } catch (err) {
    console.error('初始化缩略图失败:', err)
    // 缩略图失败不应影响主要功能
  }
}

// 渲染单个缩略图
const renderThumbnail = async (pageNum) => {
  if (!pdfDoc.value || !thumbnailRefs.value[pageNum]) return

  try {
    const page = await pdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: 0.2 })
    const canvas = thumbnailRefs.value[pageNum]
    const context = canvas.getContext('2d')

    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise
  } catch (err) {
    console.error(`渲染缩略图${pageNum}失败:`, err)
  }
}

// 页面导航 - 简化版本
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    renderPage(currentPage.value)
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    renderPage(currentPage.value)
  }
}

const goToPage = (pageNum) => {
  // 验证页码
  if (pageNum >= 1 && pageNum <= totalPages.value) {
    currentPage.value = pageNum
    renderPage(currentPage.value)
    return true
  }
  return false
}

const jumpToPage = () => {
  const page = parseInt(pageInput.value)
  if (isNaN(page) || page < 1 || page > totalPages.value) {
    pageInput.value = currentPage.value
    return false
  }
  return goToPage(page)
}

// 缩放控制
const zoomIn = () => {
  scale.value = Math.min(scale.value + 0.25, 3)
  renderPage(currentPage.value)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value - 0.25, 0.5)
  renderPage(currentPage.value)
}

const resetZoom = () => {
  scale.value = 1.5
  renderPage(currentPage.value)
}

// 旋转控制
const rotateLeft = () => {
  rotation.value = (rotation.value - 90) % 360
  renderPage(currentPage.value)
}

const rotateRight = () => {
  rotation.value = (rotation.value + 90) % 360
  renderPage(currentPage.value)
}

// 切换缩略图
const toggleThumbnails = () => {
  showThumbnails.value = !showThumbnails.value
  // 当显示缩略图时初始化
  if (showThumbnails.value && pdfDoc.value) {
    nextTick(() => {
      initThumbnails()
    })
  }
}

// 键盘快捷键
const handleKeydown = (event) => {
  // 防止在输入框中时触发快捷键
  if (event.target.tagName === 'INPUT') return

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      previousPage()
      break
    case 'ArrowRight':
      event.preventDefault()
      nextPage()
      break
    case '+':
    case '=':
      event.preventDefault()
      zoomIn()
      break
    case '-':
      event.preventDefault()
      zoomOut()
      break
    case '0':
      event.preventDefault()
      resetZoom()
      break
  }
}

// 初始化
scale.value = props.initialScale

// 监听URL变化
watch(() => props.url, () => {
  if (props.url) {
    currentPage.value = 1
    rotation.value = 0
    scale.value = props.initialScale
    pageInput.value = 1
    showThumbnails.value = false // 重置缩略图状态
    // 使用nextTick确保DOM已更新
    nextTick(() => {
      loadPdf()
    })
  }
}, { immediate: true })

// 监听当前页变化
watch(currentPage, (newPage) => {
  pageInput.value = newPage
})

// 生命周期
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  console.log('组件卸载，清理资源...')

  window.removeEventListener('keydown', handleKeydown)

  // 彻底清理资源
  if (pdfDoc.value) {
    pdfDoc.value.destroy()
    pdfDoc.value = null
  }

  // 清理DOM引用
  canvasRef.value = null
  containerRef.value = null
  thumbnailRefs.value = {}

  // 重置状态
  pdfDoc.value = null
  error.value = null
  loading.value = false
  isRendering.value = false
  renderQueue.value = null
})
</script>

<style scoped>
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #525659;
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #323639;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 60px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toolbar-btn {
  padding: 0.5rem 0.75rem;
  background-color: #464a4d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 1rem;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: #5a5e61;
}

.toolbar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.page-input {
  width: 50px;
  padding: 0.25rem 0.5rem;
  background-color: #464a4d;
  color: white;
  border: 1px solid #5a5e61;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
}

.page-input:focus {
  outline: none;
  border-color: #667eea;
}

.zoom-level {
  min-width: 50px;
  text-align: center;
  font-size: 0.9rem;
}

.viewer-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.thumbnails-sidebar {
  width: 200px;
  background-color: #3a3e41;
  border-right: 1px solid #2a2e31;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.thumbnails-header {
  padding: 1rem;
  background-color: #323639;
  color: white;
  font-weight: 500;
  text-align: center;
  border-bottom: 1px solid #2a2e31;
}

.thumbnails-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.thumbnail-item {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: #464a4d;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.thumbnail-item:hover {
  background-color: #5a5e61;
  transform: translateX(4px);
}

.thumbnail-item.active {
  background-color: #667eea;
  box-shadow: 0 0 8px rgba(102, 126, 234, 0.5);
}

.thumbnail-canvas {
  width: 100%;
  height: auto;
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.thumbnail-label {
  margin-top: 0.5rem;
  text-align: center;
  color: white;
  font-size: 0.8rem;
}

.pdf-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
  padding: 2rem;
  position: relative;
}

.canvas-wrapper {
  display: inline-block;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  background-color: white;
  transition: transform 0.3s ease;
}

canvas {
  display: block;
}

.loading {
  text-align: center;
  color: white;
}

.pdf-error {
  text-align: center;
  color: white;
  padding: 2rem;
  background-color: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 8px;
  max-width: 400px;
}

.error-message {
  margin-bottom: 1rem;
  color: #ffcccc;
}

.retry-button {
  padding: 0.5rem 1.5rem;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background-color: #5a67d8;
}

.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 1rem;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 滚动条样式 */
.thumbnails-list::-webkit-scrollbar,
.pdf-container::-webkit-scrollbar {
  width: 8px;
}

.thumbnails-list::-webkit-scrollbar-track,
.pdf-container::-webkit-scrollbar-track {
  background: #2a2e31;
}

.thumbnails-list::-webkit-scrollbar-thumb,
.pdf-container::-webkit-scrollbar-thumb {
  background: #464a4d;
  border-radius: 4px;
}

.thumbnails-list::-webkit-scrollbar-thumb:hover,
.pdf-container::-webkit-scrollbar-thumb:hover {
  background: #5a5e61;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar {
    justify-content: center;
  }

  .thumbnails-sidebar {
    width: 150px;
  }

  .pdf-container {
    padding: 1rem;
  }
}
</style>
