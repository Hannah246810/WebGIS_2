<template>
  <div class="native-app-container">
    <header class="native-header">
      <div class="header-content">
        <h1 class="app-title">HHU校园攻略</h1>
        <div :class="['role-indicator', currentUserRole]">
          <span class="pulse-dot"></span>
          {{ roleNameMap[currentUserRole] }}
        </div>
      </div>
    </header>

    <div :class="['native-toast', toastVisible ? 'show' : '']">
      {{ toastMessage }}
    </div>

    <main class="native-content">
      
      <div id="map-wrapper" :class="{ 'hidden-view': currentTab !== 'map' }">
        <div id="map"></div>

        <div class="glass-filters">
          <span v-for="cat in categories" :key="cat" :class="['filter-chip', activeCategory === cat ? 'active' : '']" @click="filterByCategory(cat)">
            {{ cat }}
          </span>
        </div>

        <div class="side-tools">
          <button :class="['tool-btn', isHeatmapMode ? 'heat-active' : '']" @click="toggleHeatmap">
            <span class="tool-icon">🔥</span>
            <span class="tool-label">{{ isHeatmapMode ? '关闭热力' : '设施热力' }}</span>
          </button>

          <button :class="['tool-btn', isRadarMode ? 'radar-active' : '']" @click="toggleRadarMode">
            <span class="tool-icon">📡</span>
            <span class="tool-label">{{ isRadarMode ? '关闭雷达' : '周边雷达' }}</span>
          </button>

          <button v-if="currentUserRole === 'admin'" :class="['tool-btn', 'admin-btn', isAddMode ? 'add-active' : '']" @click="toggleAddMode">
            <span class="tool-icon">{{ isAddMode ? '✖' : '➕' }}</span>
            <span class="tool-label">{{ isAddMode ? '取消选点' : '新增攻略' }}</span>
          </button>
        </div>
      </div>

      <div v-if="currentTab === 'info'" class="native-view bg-light">
        <div class="search-header">
          <input type="text" v-model="searchKeyword" @input="fetchPlaces" placeholder="搜索地点或设施..." class="search-input" />
        </div>
        <div class="scroll-list">
          <div v-if="places.length === 0" class="empty-state">未找到相关攻略信息</div>
          <div v-for="item in places" :key="item.place_id" class="info-card">
            <div class="card-head">
              <h3 class="card-title">{{ item.name }}</h3>
              <span class="tag-cat">{{ item.category }}</span>
            </div>
            <p class="card-desc">{{ item.description || '暂无位置描述' }}</p>
            <div class="card-foot">
              <span class="card-time">营业: {{ item.open_hours || '未知' }}</span>
              <span class="card-action" @click="locateOnMap(item)">查看位置 ➔</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentTab === 'user'" class="native-view bg-light flex-center">
        <div class="profile-card">
          <div class="avatar-box"></div>
          <h2 class="profile-title">系统登录</h2>
          <div class="form-group">
            <select v-model="tempSelectedRole" class="native-select">
              <option value="guest">游客身份</option>
              <option value="student">河海学生</option>
              <option value="admin">系统管理员</option>
            </select>
            <button class="primary-btn" @click="handleLogin">切换身份</button>
          </div>
        </div>
      </div>

      <div :class="['bottom-sheet-bg', showForm ? 'show' : '']" @click.self="closeForm">
        <div class="bottom-sheet">
          <div class="drag-bar"></div>
          <div class="sheet-header">
            <span class="action-text cancel" @click="closeForm">取消</span>
            <h3 class="sheet-title">录入新攻略</h3>
            <span class="action-text submit" @click="submitNewPlace">保存</span>
          </div>
          
          <div class="sheet-scroll-body">
            <div class="input-block">
              <input type="text" v-model="formData.name" placeholder="主建筑/设施名称" class="large-input" />
              <div class="row-inputs">
                <select v-model="formData.category" class="std-input">
                  <option v-for="cat in categories.slice(1)" :key="cat" :value="cat">{{ cat }}</option>
                </select>
                <input type="text" v-model="formData.open_hours" placeholder="营业时间" class="std-input" />
              </div>
              <input type="text" v-model="formData.description" placeholder="详细位置描述 (选填)" class="std-input" />
            </div>

            <div class="seg-control">
              <div :class="['seg-btn', !formData.isComplex ? 'active' : '']" @click="formData.isComplex = false">独立设施</div>
              <div :class="['seg-btn', formData.isComplex ? 'active' : '']" @click="formData.isComplex = true">综合楼层(内部细分)</div>
            </div>

            <div v-if="formData.isComplex" class="floor-builder">
              <div v-for="(floor, fIdx) in formData.floors" :key="fIdx" class="floor-box">
                <div class="floor-head">
                  <input type="text" v-model="floor.floorName" placeholder="楼层名称" class="floor-name-input" />
                  <span class="del-btn" @click="removeFloor(fIdx)">移除</span>
                </div>
                <div class="shop-grid">
                  <input v-for="(shop, sIdx) in floor.shops" :key="sIdx" type="text" v-model="shop.shopName" placeholder="店铺名" class="shop-input" />
                  <button class="add-shop-btn" @click="addShopToFloor(fIdx)">+ 店铺</button>
                </div>
              </div>
              <button class="add-floor-btn" @click="addFloor">+ 新增楼层</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <nav class="native-tabbar">
      <div :class="['tab', currentTab === 'map' ? 'active' : '']" @click="switchTab('map')">
        <div class="tab-icon">🌍</div>
        <span>探索</span>
      </div>
      <div :class="['tab', currentTab === 'info' ? 'active' : '']" @click="switchTab('info')">
        <div class="tab-icon">📖</div>
        <span>攻略</span>
      </div>
      <div :class="['tab', currentTab === 'user' ? 'active' : '']" @click="switchTab('user')">
        <div class="tab-icon">👤</div>
        <span>我的</span>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { onMounted, ref, nextTick } from 'vue';
import * as L from 'leaflet';
// 绑定到 window 以防 heatmap 插件找不到 L
window.L = L;
import 'leaflet.heat'; 
import axios from 'axios';

// --- 基础配置 ---
const categories = ['全部', '餐饮', '快递', '学习', '生活', '交通', '其他'];
const roleNameMap = { guest: '游客', student: '河海学生', admin: '管理员' };

// --- 状态管理 ---
const currentTab = ref('map');
const currentUserRole = ref('guest');
const tempSelectedRole = ref('guest');
const places = ref([]);
const searchKeyword = ref('');
const activeCategory = ref('全部');

// GIS空间分析与操作状态
const isAddMode = ref(false);
const isRadarMode = ref(false);
const isHeatmapMode = ref(false);

const toastVisible = ref(false);
const toastMessage = ref('');

// 表单响应式数据
const showForm = ref(false);
const formData = ref({ 
  name: '', category: '餐饮', lng: '', lat: '', description: '', open_hours: '',
  isComplex: false, floors: [{ floorName: '1楼', shops: [{ shopName: '' }] }] 
});

const mapInstance = ref(null);
const markersGroup = ref(null);
const tempMarker = ref(null);
const bufferCircle = ref(null); 
const heatLayer = ref(null); // 热力图图层

// --- 交互逻辑 ---
const showToast = (msg) => {
  toastMessage.value = msg;
  toastVisible.value = true;
  setTimeout(() => { toastVisible.value = false; }, 2500);
};

const switchTab = (tabName) => {
  currentTab.value = tabName;
  if (tabName === 'map') {
    nextTick(() => { if (mapInstance.value) mapInstance.value.invalidateSize(); });
  } else {
    resetAllModes();
  }
};

const handleLogin = () => {
  currentUserRole.value = tempSelectedRole.value;
  showToast(`欢迎, ${roleNameMap[currentUserRole.value]}`);
  switchTab('map');
};

const resetAllModes = () => {
  isAddMode.value = false;
  isRadarMode.value = false;
  isHeatmapMode.value = false;
  removeTempLayers();
}

const toggleAddMode = () => {
  isAddMode.value = !isAddMode.value;
  isRadarMode.value = false;
  isHeatmapMode.value = false;
  removeTempLayers();
  if (isAddMode.value) showToast('请点击地图目标位置录入数据');
};

const toggleRadarMode = () => {
  isRadarMode.value = !isRadarMode.value;
  isAddMode.value = false;
  isHeatmapMode.value = false;
  removeTempLayers();
  if (isRadarMode.value) showToast('📡 缓冲区分析已开启：点击地图探测周边200m设施');
};

// --- GIS 空间分析：热力图 ---
const toggleHeatmap = () => {
  isHeatmapMode.value = !isHeatmapMode.value;
  isAddMode.value = false;
  isRadarMode.value = false;
  removeTempLayers();

  if (isHeatmapMode.value) {
    // 隐藏普通图标
    if(markersGroup.value) mapInstance.value.removeLayer(markersGroup.value);
    
    // 提取坐标数据 [lat, lng, intensity]
    const heatData = places.value.filter(p => p.lat && p.lng).map(p => [parseFloat(p.lat), parseFloat(p.lng), 1]);
    
    // 渲染热力图层
    heatLayer.value = L.heatLayer(heatData, { 
      radius: 25, blur: 15, maxZoom: 17, 
      gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'} 
    }).addTo(mapInstance.value);
    
    showToast('🔥 热力图已开启：颜色越暖代表设施越密集');
  } else {
    // 恢复普通图标
    if(markersGroup.value) mapInstance.value.addLayer(markersGroup.value);
  }
};

const addFloor = () => { formData.value.floors.push({ floorName: '', shops: [{ shopName: '' }] }); };
const removeFloor = (idx) => { formData.value.floors.splice(idx, 1); };
const addShopToFloor = (fIdx) => { formData.value.floors[fIdx].shops.push({ shopName: '' }); };

const closeForm = () => {
  showForm.value = false;
  removeTempLayers();
};

const removeTempLayers = () => {
  if (tempMarker.value && mapInstance.value) { mapInstance.value.removeLayer(tempMarker.value); tempMarker.value = null; }
  if (bufferCircle.value && mapInstance.value) { mapInstance.value.removeLayer(bufferCircle.value); bufferCircle.value = null; }
  if (heatLayer.value && mapInstance.value) { 
    mapInstance.value.removeLayer(heatLayer.value); heatLayer.value = null; 
    if(markersGroup.value && mapInstance.value && !mapInstance.value.hasLayer(markersGroup.value)){
       mapInstance.value.addLayer(markersGroup.value);
    }
  }
};

const filterByCategory = (cat) => {
  activeCategory.value = cat;
  fetchPlaces();
  if(isHeatmapMode.value) { // 如果在热力图模式下切换分类，重绘热力图
    toggleHeatmap(); 
    setTimeout(toggleHeatmap, 50);
  }
};

const fetchPlaces = async () => {
  try {
    let url = `http://localhost:3000/api/places?keyword=${searchKeyword.value}`;
    if (activeCategory.value !== '全部') url += `&category=${activeCategory.value}`;
    const response = await axios.get(url);
    places.value = response.data;
    renderMarkersOnMap();
  } catch (error) {
    showToast('数据拉取失败');
  }
};

// --- GIS 空间缓冲分析 ---
const executeBufferAnalysis = (lat, lng) => {
  removeTempLayers();
  bufferCircle.value = L.circle([lat, lng], {
    color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.15, radius: 200, weight: 2
  }).addTo(mapInstance.value);

  let count = 0;
  places.value.forEach(p => {
    if(p.lat && p.lng) {
      const distance = mapInstance.value.distance([lat, lng], [p.lat, p.lng]);
      if (distance <= 200) count++;
    }
  });

  showToast(`📍 探测完成：200米生活圈内共有 ${count} 个便民设施`);
  mapInstance.value.fitBounds(bufferCircle.value.getBounds(), { padding: [50, 50] });
};

// --- 地图渲染与精美弹窗 ---
const renderMarkersOnMap = () => {
  if (!mapInstance.value || !markersGroup.value) return;
  markersGroup.value.clearLayers();

  places.value.forEach(place => {
    if (place.lat && place.lng) {
      let subContent = '';
      if (place.strategy_data && place.strategy_data.floors && place.strategy_data.floors.length > 0) {
        subContent = `<div class="popup-floors">`;
        place.strategy_data.floors.forEach(f => {
          if(!f.floorName) return;
          subContent += `<div class="f-name">${f.floorName}</div><div class="f-shops">`;
          f.shops.forEach(s => {
            if(s.shopName) subContent += `<span class="s-tag">${s.shopName}</span>`;
          });
          subContent += `</div>`;
        });
        subContent += `</div>`;
      }

      const popupHtml = `
        <div class="custom-popup">
          <div class="cp-head">
            <h4 class="cp-title">${place.name}</h4>
            <span class="cp-cat">${place.category}</span>
          </div>
          ${place.description ? `<p class="cp-desc">${place.description}</p>` : ''}
          ${subContent}
        </div>
      `;

      L.marker([place.lat, place.lng]).bindPopup(popupHtml, { minWidth: 200, maxWidth: 260 }).addTo(markersGroup.value);
    }
  });
};

const submitNewPlace = async () => {
  if (!formData.value.name.trim()) { showToast('设施名称为必填项'); return; }

  const cleanedFloors = formData.value.floors.map(f => ({
    floorName: f.floorName,
    shops: f.shops.filter(s => s.shopName.trim() !== '')
  })).filter(f => f.floorName.trim() !== '' && f.shops.length > 0);

  try {
    const payload = {
      name: formData.value.name, category: formData.value.category, lng: formData.value.lng, lat: formData.value.lat,
      description: formData.value.description, open_hours: formData.value.open_hours, role: currentUserRole.value,
      strategy_data: formData.value.isComplex ? { floors: cleanedFloors } : null
    };

    const response = await axios.post('http://localhost:3000/api/places', payload);
    if (response.data.success) {
      showToast('🎉 数据已写入 PostgreSQL 空间数据库！');
      showForm.value = false;
      resetAllModes();
      fetchPlaces(); 
    }
  } catch (error) { showToast('保存失败'); }
};

const locateOnMap = (item) => {
  currentTab.value = 'map';
  activeCategory.value = '全部';
  fetchPlaces();
  nextTick(() => {
    if (mapInstance.value) {
      mapInstance.value.invalidateSize();
      mapInstance.value.setView([item.lat, item.lng], 18, { animate: true });
    }
  });
};

onMounted(() => {
  mapInstance.value = L.map('map', { center: [31.9242, 118.7905], zoom: 16, zoomControl: false });
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'], attribution: '© 高德 / HHU'
  }).addTo(mapInstance.value);

  markersGroup.value = L.layerGroup().addTo(mapInstance.value);

  mapInstance.value.on('click', (e) => {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (isRadarMode.value) {
      executeBufferAnalysis(lat, lng);
      return;
    }

    if (isAddMode.value && currentUserRole.value === 'admin') {
      formData.value.lat = lat.toFixed(6);
      formData.value.lng = lng.toFixed(6);
      formData.value.name = ''; formData.value.description = ''; formData.value.open_hours = '';
      formData.value.isComplex = false;
      formData.value.floors = [{ floorName: '1楼', shops: [{ shopName: '' }] }];

      removeTempLayers();
      tempMarker.value = L.circleMarker([lat, lng], { color: '#ef4444', radius: 8, fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }).addTo(mapInstance.value);
      showForm.value = true;
    }
  });

  fetchPlaces();
});
</script>

<style>
/* ================== 终极纯正 iOS Native App 视觉规范 (解决高度与白字 Bug) ================== */

/* 1. 基础容器设置：解决桌面端撑满全屏、太丑的问题 */
html, body { 
  margin: 0; padding: 0; 
  width: 100vw; height: 100vh; 
  background: #e5e7eb; /* 电脑端显示的高级灰背景 */
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif; 
  -webkit-font-smoothing: antialiased; user-select: none; 
}

#app { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }

/* 响应式手机壳设计 */
.native-app-container { 
  width: 100%; height: 100vh; height: 100dvh; 
  max-width: 420px; 
  background: #f2f2f7; display: flex; flex-direction: column; position: relative; 
}

/* 在电脑上显示为带边框的圆角手机模拟器 */
@media (min-width: 480px) {
  .native-app-container {
    height: 850px; max-height: 90vh;
    border-radius: 40px;
    box-shadow: 0 24px 48px rgba(0,0,0,0.15);
    border: 10px solid #1f2937; /* 模拟手机黑边 */
    overflow: hidden;
  }
}

/* 顶部 Header */
.native-header { height: 50px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 0.5px solid rgba(0,0,0,0.1); z-index: 100; flex-shrink: 0; }
.header-content { display: flex; justify-content: space-between; align-items: center; height: 100%; padding: 0 16px; }
.app-title { font-size: 17px; font-weight: 600; color: #1f2937; margin: 0; }
.role-indicator { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px; background: #e5e5ea; color: #8e8e93; }
.role-indicator.admin { background: #e0f2fe; color: #0284c7; }
.role-indicator.student { background: #dcfce7; color: #166534; }
.pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

/* 全局 Toast */
.native-toast { position: absolute; top: 60px; left: 50%; transform: translateX(-50%) translateY(-20px) scale(0.95); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 500; opacity: 0; pointer-events: none; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); white-space: nowrap; }
.native-toast.show { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }

/* 主体视窗 (锁定高度防超出) */
.native-content { flex: 1; position: relative; overflow: hidden; width: 100%; }
.native-view { position: absolute; inset: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.bg-light { background: #f2f2f7; }
.flex-center { display: flex; align-items: center; justify-content: center; }

/* 模块一：地图与工具 */
#map-wrapper, #map { width: 100%; height: 100%; position: absolute; inset: 0; }
.hidden-view { opacity: 0; pointer-events: none; }

.glass-filters { position: absolute; top: 12px; left: 12px; right: 12px; z-index: 1000; display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; }
.glass-filters::-webkit-scrollbar { display: none; }
.filter-chip { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; color: #3c3c43; box-shadow: 0 2px 8px rgba(0,0,0,0.06); white-space: nowrap; transition: 0.2s; cursor: pointer; }
.filter-chip.active { background: #007aff; color: white; }

.side-tools { position: absolute; bottom: 24px; right: 16px; z-index: 1000; display: flex; flex-direction: column; gap: 12px; }
.tool-btn { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border: none; padding: 10px 16px; border-radius: 24px; font-size: 13px; font-weight: 600; color: #3c3c43; box-shadow: 0 4px 12px rgba(0,0,0,0.1); cursor: pointer; transition: 0.2s; }
.tool-btn.heat-active { background: #f97316; color: white; }
.tool-btn.radar-active { background: #0ea5e9; color: white; }
.tool-btn.add-active { background: #ef4444; color: white; }
.tool-icon { font-size: 16px; }

/* 模块二：地点列表 */
.search-header { padding: 12px 16px; background: #fff; position: sticky; top: 0; z-index: 10; border-bottom: 0.5px solid rgba(0,0,0,0.05); }
.search-input { width: 100%; background: #e3e3e8; border: none; padding: 10px 14px; border-radius: 10px; font-size: 15px; outline: none; box-sizing: border-box; color: #1f2937; }
.scroll-list { padding: 16px; padding-bottom: 40px; }
.empty-state { text-align: center; color: #8e8e93; font-size: 14px; margin-top: 40px; }
.info-card { background: #fff; border-radius: 16px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.03); }
.card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.card-title { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; }
.tag-cat { font-size: 11px; background: #f2f2f7; color: #007aff; padding: 3px 8px; border-radius: 6px; font-weight: 600; }
.card-desc { font-size: 13px; color: #8e8e93; margin: 0 0 12px 0; }
.card-foot { display: flex; justify-content: space-between; align-items: center; border-top: 0.5px solid #e5e5ea; padding-top: 10px; }
.card-time { font-size: 12px; color: #8e8e93; }
.card-action { font-size: 13px; color: #007aff; font-weight: 600; cursor: pointer; }

/* 模块三：用户中心 */
.profile-card { background: #fff; border-radius: 20px; width: 85%; padding: 30px 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; }
.avatar-box { width: 70px; height: 70px; background: #e5e5ea; border-radius: 50%; margin: 0 auto 16px auto; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238e8e93"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'); background-size: 60%; background-repeat: no-repeat; background-position: center; }
.profile-title { font-size: 18px; font-weight: 600; margin: 0 0 24px 0; color: #1f2937; }
.native-select { width: 100%; background: #f2f2f7; border: none; padding: 14px; border-radius: 12px; font-size: 16px; margin-bottom: 16px; outline: none; -webkit-appearance: none; text-align: center; color: #007aff; font-weight: 600; }
.primary-btn { width: 100%; background: #007aff; color: white; border: none; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; }

/* ================= Bottom Sheet 表单 & 修复字体白化问题 ================= */
.bottom-sheet-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.3); z-index: 2000; opacity: 0; pointer-events: none; transition: 0.3s; display: flex; flex-direction: column; justify-content: flex-end; }
.bottom-sheet-bg.show { opacity: 1; pointer-events: auto; }
.bottom-sheet { width: 100%; background: #f2f2f7; border-radius: 20px 20px 0 0; transform: translateY(100%); transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; max-height: 85vh; }
.bottom-sheet-bg.show .bottom-sheet { transform: translateY(0); }
.drag-bar { width: 36px; height: 5px; background: #c7c7cc; border-radius: 3px; margin: 10px auto; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; padding: 0 16px 14px 16px; border-bottom: 0.5px solid #e5e5ea; }
.sheet-title { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;}
.action-text { font-size: 16px; font-weight: 500; cursor: pointer; }
.action-text.cancel { color: #8e8e93; }
.action-text.submit { color: #007aff; font-weight: 600; }
.sheet-scroll-body { overflow-y: auto; padding: 16px; -webkit-overflow-scrolling: touch; }

.input-block { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }

/* 🔥 修复点：强制设置所有输入框文本颜色，确保有清晰黑字！ */
.large-input, .std-input, .floor-name-input, .shop-input { color: #1f2937 !important; background: transparent; }

.large-input { width: 100%; border: none; border-bottom: 0.5px solid #e5e5ea; padding: 16px; font-size: 16px; font-weight: 600; outline: none; box-sizing: border-box; }
.row-inputs { display: flex; border-bottom: 0.5px solid #e5e5ea; }
.std-input { width: 100%; border: none; padding: 14px 16px; font-size: 15px; outline: none; box-sizing: border-box; }
.row-inputs .std-input:first-child { border-right: 0.5px solid #e5e5ea; }

.seg-control { display: flex; background: #e3e3e8; padding: 3px; border-radius: 9px; margin-bottom: 16px; }
.seg-btn { flex: 1; text-align: center; padding: 8px 0; font-size: 14px; font-weight: 500; color: #8e8e93; border-radius: 7px; transition: 0.2s; }
.seg-btn.active { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 600; color: #1f2937; }

.floor-box { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.floor-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 0.5px dashed #e5e5ea; padding-bottom: 8px; margin-bottom: 10px; }
.floor-name-input { border: none; font-size: 15px; font-weight: 600; color: #007aff !important; outline: none; width: 70%; }
.del-btn { font-size: 13px; color: #ff3b30; }
.shop-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.shop-input { width: calc(50% - 4px); border: 1px solid #e5e5ea; border-radius: 8px; padding: 8px 10px; font-size: 14px; box-sizing: border-box; outline: none; }
.add-shop-btn { width: calc(50% - 4px); border: 1px dashed #007aff; background: transparent; color: #007aff; border-radius: 8px; font-size: 13px; }
.add-floor-btn { width: 100%; border: none; background: transparent; color: #007aff; font-size: 15px; font-weight: 600; padding: 10px 0; }

/* 底部原生导航栏 */
.native-tabbar { height: 50px; background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 0.5px solid rgba(0,0,0,0.1); display: flex; justify-content: space-around; padding-bottom: env(safe-area-inset-bottom); z-index: 100; flex-shrink: 0; }
.tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: #8e8e93; transition: 0.2s; width: 60px; }
.tab-icon { font-size: 20px; filter: grayscale(1); opacity: 0.6; }
.tab span { font-size: 10px; font-weight: 500; }
.tab.active { color: #007aff; }
.tab.active .tab-icon { filter: grayscale(0); opacity: 1; }

/* Leaflet 地图气泡修正 */
.leaflet-popup-content-wrapper { border-radius: 14px; padding: 0; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.leaflet-popup-content { margin: 0; }
.custom-popup { padding: 14px; }
.cp-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.cp-title { margin: 0; font-size: 15px; font-weight: 600; color: #1f2937; }
.cp-cat { font-size: 11px; background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; }
.cp-desc { margin: 0 0 10px 0; font-size: 12px; color: #8e8e93; }
.popup-floors { background: #f2f2f7; border-radius: 8px; padding: 8px; max-height: 140px; overflow-y: auto; }
.f-name { font-size: 12px; font-weight: 600; color: #1f2937; margin: 4px 0; }
.f-shops { display: flex; flex-wrap: wrap; gap: 4px; }
.s-tag { background: #fff; border: 0.5px solid #e5e5ea; border-radius: 4px; padding: 2px 6px; font-size: 11px; color: #3c3c43; }
</style>