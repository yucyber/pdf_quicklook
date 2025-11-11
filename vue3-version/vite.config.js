import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'pdfjs-dist': 'pdfjs-dist'
    }
  },
  server: {
    port: 3000,
    open: true,
    // 允许访问本地文件系统
    fs: {
      allow: ['.']
    }
  },
  // 强制Vite预优化pdfjs-dist
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  // 配置worker处理
  worker: {
    format: 'es', // 明确Worker的模块格式
    plugins: () => [] // Vite 5要求plugins是返回插件数组的函数
  }
})

