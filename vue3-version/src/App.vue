<template>
  <div class="app-container">
    <header class="app-header">
      <h1>📄 Vue3 PDF预览器 </h1>
    </header>

    <main class="app-main">
      <!-- 使用纯组件进行基础验证 -->
      <PDFViewerPure />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
// 引入纯PDF组件进行验证
import PDFViewerPure from './components/PDFViewerPure.vue'
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.app-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.file-upload {
  display: flex;
  gap: 0.5rem;
}

.btn-upload,
.btn-sample {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.btn-upload {
  background-color: white;
  color: #667eea;
}

.btn-upload:hover {
  background-color: #f0f0f0;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-sample {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-sample:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.app-main {
  flex: 1;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  font-size: 1.1rem;
  margin: 0.5rem 0;
}

.hint {
  color: #999;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .app-header h1 {
    font-size: 1.2rem;
  }

  .file-upload {
    width: 100%;
    flex-direction: column;
  }

  .btn-upload,
  .btn-sample {
    width: 100%;
  }
}
</style>
