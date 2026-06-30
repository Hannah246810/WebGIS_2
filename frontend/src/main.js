import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// 核心：引入 Leaflet 官方标准样式文件（不引的话地图会错位、按钮会碎裂）
import 'leaflet/dist/leaflet.css'

createApp(App).mount('#app')