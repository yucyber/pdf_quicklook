/**
 * PdfViewer - 原生JavaScript PDF预览插件
 * 基于 PDF.js 实现的功能完整的PDF查看器
 */

// 使用全局PDFJS变量（通过CDN引入）
const pdfjsLib = window['pdfjs-dist'] || window['pdfjs-dist/build/pdf'] || window.pdfjsLib || window.pdfjs;

class PdfViewer {
  constructor(options = {}) {
    // 配置选项 - 添加默认值和参数验证
    this.options = {
      container: options.container || '#pdf-viewer',
      url: options.url || '',
      scale: typeof options.scale === 'number' && options.scale > 0 ? options.scale : 1.5,
      onLoad: options.onLoad || function() {},
      onError: options.onError || function(err) { console.error('PDF错误:', err); },
      onPageChange: options.onPageChange || function() {},
      thumbnailCount: options.thumbnailCount || 5 // 初始加载的缩略图数量
    }

    // 状态管理
    this.pdfDoc = null
    this.currentPage = 1
    this.totalPages = 0
    this.scale = this.options.scale
    this.rotation = 0
    this.showThumbnails = false
    
    // 性能优化状态
    this.isRendering = false
    this.renderQueue = null

    // DOM元素
    this.container = null
    this.canvas = null
    this.thumbnailsContainer = null
    this.errorContainer = null

    // 初始化
    this.init()
  }

  /**
   * 初始化插件
   */
  init() {
    // 获取容器元素
    this.container = typeof this.options.container === 'string'
      ? document.querySelector(this.options.container)
      : this.options.container

    if (!this.container) {
      console.error('容器元素未找到')
      return
    }

    // 创建UI
    this.createUI()

    // 绑定事件
    this.bindEvents()

    // 加载PDF
    if (this.options.url) {
      this.loadPdf(this.options.url)
    }
  }

  /**
   * 创建用户界面
   */
  createUI() {
    this.container.className = 'pdf-viewer'
    
    this.container.innerHTML = `
      <div class="pdf-toolbar">
        <div class="toolbar-section">
          <button class="toolbar-btn" data-action="prev" title="上一页" disabled>◀</button>
          <div class="page-info">
            <input type="number" class="page-input" value="1" min="1" />
            <span class="page-total">/ 0</span>
          </div>
          <button class="toolbar-btn" data-action="next" title="下一页" disabled>▶</button>
        </div>

        <div class="toolbar-section">
          <button class="toolbar-btn" data-action="zoom-out" title="缩小">🔍-</button>
          <span class="zoom-level">100%</span>
          <button class="toolbar-btn" data-action="zoom-in" title="放大">🔍+</button>
          <button class="toolbar-btn" data-action="zoom-reset" title="重置缩放">⊡</button>
        </div>

        <div class="toolbar-section">
          <button class="toolbar-btn" data-action="rotate-left" title="逆时针旋转">↺</button>
          <button class="toolbar-btn" data-action="rotate-right" title="顺时针旋转">↻</button>
          <button class="toolbar-btn" data-action="toggle-thumbnails" title="缩略图">☰</button>
        </div>
      </div>

      <div class="pdf-content">
        <div class="pdf-thumbnails" style="display: none;">
          <div class="thumbnails-header">缩略图</div>
          <div class="thumbnails-list"></div>
        </div>
        
        <div class="pdf-canvas-container">
          <div class="pdf-loading">
            <div class="spinner"></div>
            <p>加载中...</p>
          </div>
          <div class="canvas-wrapper" style="display: none;">
            <canvas class="pdf-canvas"></canvas>
          </div>
          <div class="pdf-error" style="display: none;">
            <p class="error-message">加载失败，请重试</p>
            <button class="retry-button">重新加载</button>
          </div>
        </div>
      </div>
    `

    // 保存常用元素引用
    this.canvas = this.container.querySelector('.pdf-canvas')
    this.canvasWrapper = this.container.querySelector('.canvas-wrapper')
    this.loadingEl = this.container.querySelector('.pdf-loading')
    this.errorContainer = this.container.querySelector('.pdf-error')
    this.errorMessage = this.container.querySelector('.error-message')
    this.retryButton = this.container.querySelector('.retry-button')
    this.thumbnailsPanel = this.container.querySelector('.pdf-thumbnails')
    this.thumbnailsList = this.container.querySelector('.thumbnails-list')
    this.pageInput = this.container.querySelector('.page-input')
    this.pageTotal = this.container.querySelector('.page-total')
    this.zoomLevel = this.container.querySelector('.zoom-level')
    this.prevButton = this.container.querySelector('[data-action="prev"]')
    this.nextButton = this.container.querySelector('[data-action="next"]')
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 工具栏按钮事件
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]')
      if (!btn) return

      const action = btn.dataset.action
      switch (action) {
        case 'prev':
          this.previousPage()
          break
        case 'next':
          this.nextPage()
          break
        case 'zoom-in':
          this.zoomIn()
          break
        case 'zoom-out':
          this.zoomOut()
          break
        case 'zoom-reset':
          this.resetZoom()
          break
        case 'rotate-left':
          this.rotateLeft()
          break
        case 'rotate-right':
          this.rotateRight()
          break
        case 'toggle-thumbnails':
          this.toggleThumbnails()
          break
      }
    })

    // 页码输入事件
    this.pageInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        this.jumpToPage(parseInt(this.pageInput.value))
      }
    })

    this.pageInput.addEventListener('blur', () => {
      this.jumpToPage(parseInt(this.pageInput.value))
    })

    // 重新加载按钮事件
    this.retryButton.addEventListener('click', () => {
      if (this.options.url) {
        this.loadPdf(this.options.url)
      }
    })

    // 键盘快捷键
    this.handleKeydown = (e) => {
      // 确保焦点在查看器内或文档没有其他活动元素
      if (!this.container.contains(document.activeElement) && 
          document.activeElement !== document.body) {
        return
      }

      // 防止在输入框中时触发快捷键
      const isInputFocused = document.activeElement.tagName === 'INPUT'
      if (isInputFocused) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          this.previousPage()
          break
        case 'ArrowRight':
          e.preventDefault()
          this.nextPage()
          break
        case '+':
        case '=':
          e.preventDefault()
          this.zoomIn()
          break
        case '-':
          e.preventDefault()
          this.zoomOut()
          break
        case '0':
          e.preventDefault()
          this.resetZoom()
          break
      }
    }
    
    // 使用箭头函数确保this上下文正确
    this.keydownHandler = (e) => this.handleKeydown(e)
    document.addEventListener('keydown', this.keydownHandler)
    
    // 为缩略图滚动创建防抖函数并保存引用以便后续清理
    this.scrollHandler = this.debounce(() => {
      this.loadVisibleThumbnails()
    }, 200)
    this.thumbnailsList.addEventListener('scroll', this.scrollHandler)


  }

  /**
   * 防抖函数 - 优化滚动等高频事件处理
   */
  debounce(func, wait) {
    let timeout
    // 使用箭头函数确保this上下文正确
    return (...args) => {
      const later = () => {
        clearTimeout(timeout)
        func.apply(this, args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  /**
   * 加载PDF文档
   */
  async loadPdf(url) {
    // 验证URL
    if (!url || typeof url !== 'string') {
      const error = new Error('无效的PDF URL')
      this.handleError(error)
      return
    }

    try {
      this.showLoading()
      this.hideError()
      
      // 配置PDF.js加载选项
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        withCredentials: false, // 避免跨域问题
        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/', // 支持亚洲字体
        cMapPacked: true,
        // 配置worker路径（确保CDN引入的worker可用）
        workerSrc: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      })
      
      this.pdfDoc = await loadingTask.promise
      this.totalPages = this.pdfDoc.numPages
      
      // 更新UI状态
      this.pageTotal.textContent = `/ ${this.totalPages}`
      this.pageInput.max = this.totalPages
      this.updateNavigationButtons()
      
      // 渲染当前页
      await this.renderPage(this.currentPage)
      
      // 初始化缩略图（只加载可见部分）
      this.initThumbnails()
      
      this.hideLoading()
      
      // 触发回调
      this.options.onLoad(this.totalPages)
    } catch (error) {
      console.error('PDF加载错误:', error)
      this.handleError(error)
    }
  }

  /**
   * 统一错误处理
   */
  handleError(error) {
    this.hideLoading()
    this.showError(error.message || '加载PDF失败')
    this.options.onError(error)
  }

  /**
   * 渲染指定页面
   */
  async renderPage(pageNum) {
    // 参数验证
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.totalPages) {
      return false
    }

    // 防抖处理 - 取消正在进行的渲染
    if (this.isRendering && this.renderQueue) {
      this.renderQueue.cancel()
    }

    // 创建新的渲染任务
    let isCanceled = false
    this.isRendering = true
    this.renderQueue = {
      cancel: () => { isCanceled = true }
    }

    try {
      const page = await this.pdfDoc.getPage(pageNum)
      if (isCanceled) return false
      
      // 获取视口并应用旋转
      const viewport = page.getViewport({ 
        scale: this.scale, 
        rotation: this.rotation 
      })
      
      // 设置canvas尺寸
      const context = this.canvas.getContext('2d')
      this.canvas.height = viewport.height
      this.canvas.width = viewport.width
      
      // 清除画布
      context.clearRect(0, 0, this.canvas.width, this.canvas.height)

      // 渲染页面
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      await page.render(renderContext).promise
      
      if (isCanceled) return false
      
      // 更新状态
      this.currentPage = pageNum
      this.pageInput.value = pageNum
      this.updateZoomLevel()
      this.updateNavigationButtons()
      this.updateThumbnailsActive()
      
      // 触发回调
      this.options.onPageChange(pageNum)
      
      return true
    } catch (error) {
      console.error('页面渲染错误:', error)
      return false
    } finally {
      this.isRendering = false
      this.renderQueue = null
    }
  }

  /**
   * 初始化缩略图容器
   */
  initThumbnails() {
    if (!this.pdfDoc) return

    this.thumbnailsList.innerHTML = ''

    // 创建所有缩略图占位符
    for (let i = 1; i <= this.totalPages; i++) {
      const thumbnailItem = document.createElement('div')
      thumbnailItem.className = 'thumbnail-item'
      thumbnailItem.dataset.page = i
      thumbnailItem.dataset.rendered = 'false' // 标记是否已渲染
      
      const canvas = document.createElement('canvas')
      canvas.className = 'thumbnail-canvas'
      
      const label = document.createElement('div')
      label.className = 'thumbnail-label'
      label.textContent = `第 ${i} 页`
      
      thumbnailItem.appendChild(canvas)
      thumbnailItem.appendChild(label)
      this.thumbnailsList.appendChild(thumbnailItem)
      
      // 点击缩略图跳转
      thumbnailItem.addEventListener('click', () => {
        this.jumpToPage(i)
      })
    }

    // 先加载当前页附近的缩略图
    this.loadNearbyThumbnails(this.currentPage)
  }

  /**
   * 加载当前页附近的缩略图
   */
  loadNearbyThumbnails(pageNum) {
    const startPage = Math.max(1, pageNum - Math.floor(this.options.thumbnailCount / 2))
    const endPage = Math.min(this.totalPages, startPage + this.options.thumbnailCount - 1)
    
    for (let i = startPage; i <= endPage; i++) {
      this.loadThumbnailIfNeeded(i)
    }
  }

  /**
   * 加载可见区域的缩略图
   */
  loadVisibleThumbnails() {
    const items = this.thumbnailsList.querySelectorAll('.thumbnail-item')
    
    items.forEach(item => {
      const rect = item.getBoundingClientRect()
      const listRect = this.thumbnailsList.getBoundingClientRect()
      
      // 检查元素是否在视口中
      if (rect.top < listRect.bottom && rect.bottom > listRect.top) {
        const pageNum = parseInt(item.dataset.page)
        this.loadThumbnailIfNeeded(pageNum)
      }
    })
  }

  /**
   * 仅在需要时加载缩略图
   */
  async loadThumbnailIfNeeded(pageNum) {
    const item = this.thumbnailsList.querySelector(`[data-page="${pageNum}"]`)
    if (!item || item.dataset.rendered === 'true') return
    
    const canvas = item.querySelector('canvas')
    await this.renderThumbnail(pageNum, canvas)
    item.dataset.rendered = 'true'
  }

  /**
   * 渲染单个缩略图
   */
  async renderThumbnail(pageNum, canvas) {
    try {
      const page = await this.pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale: 0.3 })
      
      const context = canvas.getContext('2d')
      canvas.height = viewport.height
      canvas.width = viewport.width

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      await page.render(renderContext).promise
    } catch (error) {
      console.error(`缩略图 ${pageNum} 渲染错误:`, error)
      // 在缩略图上显示错误状态
      if (canvas) {
        const context = canvas.getContext('2d')
        context.fillStyle = '#ffcccc'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  /**
   * 更新缩略图激活状态
   */
  updateThumbnailsActive() {
    const items = this.thumbnailsList.querySelectorAll('.thumbnail-item')
    items.forEach(item => {
      const page = parseInt(item.dataset.page)
      item.classList.toggle('active', page === this.currentPage)
    })
    
    // 当显示缩略图时，滚动到当前页缩略图
    if (this.showThumbnails) {
      const activeItem = this.thumbnailsList.querySelector('.thumbnail-item.active')
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }
  
  /**
   * 更新导航按钮状态
   */
  updateNavigationButtons() {
    this.prevButton.disabled = this.currentPage <= 1
    this.nextButton.disabled = this.currentPage >= this.totalPages
  }

  /**
   * 页面导航
   */
  async nextPage() {
    if (this.currentPage < this.totalPages) {
      await this.renderPage(this.currentPage + 1)
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      await this.renderPage(this.currentPage - 1)
    }
  }

  jumpToPage(pageNum) {
    // 验证页码
    if (isNaN(pageNum) || pageNum < 1 || pageNum > this.totalPages) {
      this.pageInput.value = this.currentPage
      // 可以添加提示
      return false
    }
    
    return this.renderPage(pageNum)
  }

  /**
   * 缩放控制
   */
  zoomIn() {
    this.scale = Math.min(this.scale + 0.25, 3)
    this.renderPage(this.currentPage)
  }

  zoomOut() {
    this.scale = Math.max(this.scale - 0.25, 0.5)
    this.renderPage(this.currentPage)
  }

  resetZoom() {
    this.scale = 1.5
    this.renderPage(this.currentPage)
  }

  updateZoomLevel() {
    this.zoomLevel.textContent = `${Math.round(this.scale * 100)}%`
  }

  /**
   * 旋转控制
   */
  rotateLeft() {
    this.rotation = (this.rotation - 90) % 360
    this.renderPage(this.currentPage)
  }

  rotateRight() {
    this.rotation = (this.rotation + 90) % 360
    this.renderPage(this.currentPage)
  }

  /**
   * 切换缩略图显示
   */
  toggleThumbnails() {
    this.showThumbnails = !this.showThumbnails
    this.thumbnailsPanel.style.display = this.showThumbnails ? 'flex' : 'none'
    
    // 当显示缩略图时，加载可见区域的缩略图
    if (this.showThumbnails) {
      this.loadVisibleThumbnails()
    }
  }

  /**
   * 显示/隐藏加载状态
   */
  showLoading() {
    this.loadingEl.style.display = 'flex'
    this.canvasWrapper.style.display = 'none'
    this.errorContainer.style.display = 'none'
  }

  hideLoading() {
    this.loadingEl.style.display = 'none'
    this.canvasWrapper.style.display = 'block'
  }
  
  /**
   * 显示错误信息
   */
  showError(message) {
    this.errorMessage.textContent = message || '加载失败'
    this.errorContainer.style.display = 'flex'
    this.loadingEl.style.display = 'none'
    this.canvasWrapper.style.display = 'none'
  }
  
  /**
   * 隐藏错误信息
   */
  hideError() {
    this.errorContainer.style.display = 'none'
  }

  /**
   * 销毁实例 - 清理所有资源
   */
  destroy() {
    // 清理事件监听器
    document.removeEventListener('keydown', this.keydownHandler)
    
    // 清理缩略图滚动事件监听器
    if (this.thumbnailsList && this.scrollHandler) {
      this.thumbnailsList.removeEventListener('scroll', this.scrollHandler)
    }
    
    // 清理PDF资源
    if (this.pdfDoc) {
      this.pdfDoc.destroy()
      this.pdfDoc = null
    }
    
    // 清空容器
    if (this.container) {
      this.container.innerHTML = ''
    }
    
    // 重置状态
    this.currentPage = 1
    this.totalPages = 0
    this.scale = this.options.scale
    this.rotation = 0
    this.showThumbnails = false
    this.isRendering = false
    this.renderQueue = null
    
    // 清空所有引用以帮助垃圾回收
    this.container = null
    this.canvas = null
    this.thumbnailsContainer = null
    this.errorContainer = null
  }
}

// 导出类到全局，以便不使用模块化系统时也能访问
window.PdfViewer = PdfViewer;

