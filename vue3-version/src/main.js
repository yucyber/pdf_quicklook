import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
// 导入pdfjs-dist并配置全局worker路径
import * as pdfjsLib from 'pdfjs-dist'

// 对于pdfjs-dist 2.16.105版本，使用相对路径方式配置workerSrc
// 不直接导入worker文件，而是指向正确的worker路径
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.js'

createApp(App).mount('#app')

