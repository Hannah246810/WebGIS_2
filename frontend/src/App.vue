<template>
  <div class="native-app-container">
    <header class="native-header">
      <div class="header-content">
        <h1 class="app-title">HHU 校园攻略</h1>
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

      <!-- ===== 地图 Tab ===== -->
      <div id="map-wrapper" :class="{ 'hidden-view': currentTab !== 'map' }">
        <div id="map"></div>

        <div class="glass-filters">
          <span
            v-for="cat in categories"
            :key="cat"
            :class="['filter-chip', activeCategory === cat ? 'active' : '']"
            @click="filterByCategory(cat)"
          >
            <span v-if="cat !== '全部'" class="chip-dot" :style="{ background: catColor(cat) }"></span>
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

          <button v-if="currentUserRole === 'student' || currentUserRole === 'admin'"  :class="['tool-btn', 'admin-btn', isAddMode ? 'add-active' : '']" @click="toggleAddMode">
            <span class="tool-icon">{{ isAddMode ? '✖' : '➕' }}</span>
            <span class="tool-label">{{ isAddMode ? '取消选点' : '新增攻略' }}</span>
          </button>
        </div>
      </div>

      <!-- ===== 攻略列表 Tab ===== -->
      <div v-if="currentTab === 'info'" class="native-view bg-light">
        <div class="search-header">
          <input type="text" v-model="searchKeyword" @input="fetchPlaces" placeholder="搜索地点或设施..." class="search-input" />
        </div>
        <div class="scroll-list">
          <div v-if="places.length === 0" class="empty-state">未找到相关攻略信息</div>

          <div v-for="item in places" :key="item.place_id" class="p-card" @click="openDetail(item)">
            <div class="p-card-top">
              <div class="p-orbit-icon" :style="{ '--ring-color': catColor(item.category) }">
                <span class="p-orbit-ring"></span>
                <span class="p-orbit-emoji">{{ catIcon(item.category) }}</span>
              </div>
              <div class="p-card-info">
                <div class="p-card-title-row">
                  <h3 class="p-card-title">{{ item.name }}</h3>
                  <span :class="['p-status-dot', statusClass(item.status_tag)]"></span>
                </div>
                <span class="p-card-sub">{{ item.category }} · {{ item.status_tag || '状态未知' }}</span>
              </div>
              <span class="p-card-chevron">›</span>
            </div>

            <p class="p-card-desc">{{ item.description || '暂无位置描述' }}</p>

            <div class="p-chip-row" v-if="getStrategy(item).highlights.length">
              <span v-for="(h, i) in getStrategy(item).highlights.slice(0, 3)" :key="i" class="p-chip">✦ {{ h }}</span>
            </div>

            <div class="card-foot">
              <span class="card-time">🕒 {{ item.open_hours || '未知' }}</span>
              <span class="card-action" @click.stop="locateOnMap(item)">📍 地图定位</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 我的 Tab ===== -->
      <div v-if="currentTab === 'user'" class="native-view bg-light" style="display:flex; flex-direction:column; align-items:center; padding-top:20px; overflow-y:auto;">

        <!-- 用户卡片 -->
        <div class="profile-card" style="width:85%; max-width:400px; flex-shrink:0;">
          <div class="avatar-box"></div>
          <h2 class="profile-title">系统登录</h2>
          <div class="form-group">
            <select v-model="tempSelectedRole" class="native-select">
              <option value="student">河海学生</option>
              <option value="admin">系统管理员</option>
            </select>
            <button class="primary-btn" @click="handleLogin">切换身份</button>
          </div>
        </div>

        <!-- ===== 学生专属：我的收藏 & 我的贡献 ===== -->
        <template v-if="currentUserRole === 'student'">
          <!-- 我的收藏 -->
          <div class="my-section" style="width:100%; padding:0 16px 16px; box-sizing:border-box;">
            <div class="section-header">
              <h3 class="section-title">⭐ 我的收藏</h3>
              <span class="section-count">{{ favorites.length }} 个</span>
            </div>
            <div v-if="loadingFavorites" class="section-loading">加载中...</div>
            <div v-else-if="favorites.length === 0" class="section-empty">暂无收藏</div>
            <div v-else>
              <div v-for="item in favorites" :key="item.place_id" class="my-card" @click="openDetail(item)">
                <div class="my-card-left">
                  <span class="my-card-name">{{ item.name }}</span>
                  <span class="my-card-cat">{{ item.category }}</span>
                </div>
                <button class="my-card-unfav" @click.stop="removeFavorite(item.place_id)">✕</button>
              </div>
            </div>
          </div>

          <!-- 我的贡献 -->
          <div class="my-section" style="width:100%; padding:0 16px 16px; box-sizing:border-box;">
            <div class="section-header">
              <h3 class="section-title">📝 我的贡献</h3>
              <span class="section-count">{{ contributions.places.length }} 个地点</span>
            </div>
            <div v-if="loadingContributions" class="section-loading">加载中...</div>
            <div v-else-if="contributions.places.length === 0" class="section-empty">暂无贡献</div>
            <div v-else>
              <div v-for="item in contributions.places" :key="item.place_id" class="my-card" @click="openDetail(item)">
                <div class="my-card-left">
                  <span class="my-card-name">{{ item.name }}</span>
                  <span class="my-card-cat">{{ item.category }}</span>
                </div>
                <span class="my-card-status" :class="item.is_approved ? 'approved' : 'pending'">
                  {{ item.is_approved ? '✅ 已上线' : '⏳ 待审核' }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- ===== 管理员专属：审核中心（含 Tab） ===== -->
        <div v-if="currentUserRole === 'admin'" class="audit-center" style="width:100%; flex:1; padding:0 16px 16px; overflow-y:auto;">
          
          <!-- Tab 切换 -->
          <div class="audit-tabs">
            <div :class="['audit-tab', auditTab === 'pending' ? 'active' : '']" 
                 @click="auditTab = 'pending'; fetchPendingPlaces();">
              待审核 <span class="tab-badge">{{ pendingPlaces.length }}</span>
            </div>
            <div :class="['audit-tab', auditTab === 'approved' ? 'active' : '']" 
                 @click="auditTab = 'approved'; fetchApprovedPlaces();">
              已上线 <span class="tab-badge">{{ approvedPlaces.length }}</span>
            </div>
          </div>

          <!-- ===== 待审核列表 ===== -->
          <div v-if="auditTab === 'pending'">
            <div v-if="loadingPending" class="audit-loading">加载中...</div>
            <div v-else-if="pendingPlaces.length === 0" class="audit-empty">🎉 暂无待审核内容</div>
            <div v-else>
              <div v-for="item in pendingPlaces" :key="item.place_id" class="audit-card">
                <div class="audit-card-header">
                  <div class="audit-card-info">
                    <span class="audit-card-name">{{ item.name }}</span>
                    <span class="audit-card-cat">{{ item.category }}</span>
                  </div>
                  <span class="audit-card-time">{{ formatTime(item.created_at) }}</span>
                </div>
                <div class="audit-card-body">
                  <p class="audit-card-desc">{{ item.description || '暂无描述' }}</p>
                  <div class="audit-card-meta">
                    <span>📍 {{ item.lng?.toFixed(6) }}, {{ item.lat?.toFixed(6) }}</span>
                    <span>👤 {{ item.submitted_by || '匿名用户' }}</span>
                  </div>
                </div>
                <div class="audit-card-actions">
                  <button class="audit-btn approve" @click="approvePlace(item.place_id)">✅ 批准上线</button>
                  <button class="audit-btn reject" @click="rejectPlace(item.place_id)">❌ 驳回</button>
                  <button class="audit-btn delete" @click="deletePlace(item.place_id)">🗑️ 删除</button>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== 已上线列表 ===== -->
          <div v-if="auditTab === 'approved'">
            <div v-if="loadingApproved" class="audit-loading">加载中...</div>
            <div v-else-if="approvedPlaces.length === 0" class="audit-empty">📭 暂无已上线地点</div>
            <div v-else>
              <div v-for="item in approvedPlaces" :key="item.place_id" class="audit-card">
                <div class="audit-card-header">
                  <div class="audit-card-info">
                    <span class="audit-card-name">{{ item.name }}</span>
                    <span class="audit-card-cat">{{ item.category }}</span>
                    <span class="audit-card-status approved">✅ 已上线</span>
                  </div>
                  <span class="audit-card-time">{{ formatTime(item.created_at) }}</span>
                </div>
                <div class="audit-card-body">
                  <p class="audit-card-desc">{{ item.description || '暂无描述' }}</p>
                  <div class="audit-card-meta">
                    <span>📍 {{ item.lng?.toFixed(6) }}, {{ item.lat?.toFixed(6) }}</span>
                    <span>👤 {{ item.submitted_by || '匿名用户' }}</span>
                  </div>
                </div>
                <div class="audit-card-actions">
                  <button class="audit-btn delete" @click="deletePlace(item.place_id)">🗑️ 删除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 新增攻略：底部表单 ============ -->
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
              <input type="text" v-model="formData.highlights" placeholder="亮点标签，用逗号分隔，如：人均15元,招牌黄焖鸡" class="std-input" />
              <textarea v-model="formData.tips" placeholder="小贴士 (选填，如：从西门进二楼靠窗视野好)" class="std-textarea"></textarea>
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
                  <div v-for="(shop, sIdx) in floor.shops" :key="sIdx" class="shop-row">
                    <input type="text" v-model="shop.shopName" placeholder="店铺/窗口名" class="shop-input" />
                    <input type="text" v-model="shop.price" placeholder="价格" class="shop-price-input" />
                    <span :class="['shop-rec-toggle', shop.recommend ? 'active' : '']" @click="shop.recommend = !shop.recommend">🔥</span>
                  </div>
                  <button class="add-shop-btn" @click="addShopToFloor(fIdx)">+ 店铺/窗口</button>
                </div>
              </div>
              <button class="add-floor-btn" @click="addFloor">+ 新增楼层</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 详情：半屏攻略抽屉 ============ -->
      <div :class="['detail-sheet-bg', showDetail ? 'show' : '']" @click.self="closeDetail">
        <div class="detail-sheet">
          <div class="drag-bar"></div>

          <div v-if="selectedPlace" class="detail-scroll">
            <div class="detail-hero">
              <div class="hero-orbit-icon" :style="{ '--ring-color': catColor(selectedPlace.category) }">
                <span class="hero-orbit-ring"></span>
                <span class="hero-orbit-ring ring-2"></span>
                <span class="hero-emoji">{{ catIcon(selectedPlace.category) }}</span>
              </div>
              <div class="hero-info">
                <h2 class="hero-title">{{ selectedPlace.name }}</h2>
                <div class="hero-meta">
                  <span class="hero-cat-badge" :style="{ background: catColor(selectedPlace.category) }">{{ selectedPlace.category }}</span>
                  <span :class="['hero-status', statusClass(selectedPlace.status_tag)]">
                    <span class="p-status-dot" :class="statusClass(selectedPlace.status_tag)"></span>
                    {{ selectedPlace.status_tag || '状态未知' }}
                  </span>
                </div>
              </div>
              <span class="hero-close" @click="closeDetail">✕</span>
            </div>

            <div class="detail-chip-row" v-if="detail.highlights.length">
              <span v-for="(h, i) in detail.highlights" :key="i" class="detail-chip">✦ {{ h }}</span>
            </div>

            <div class="detail-section" v-if="selectedPlace.description">
              <div class="section-label">📍 位置描述</div>
              <p class="section-text">{{ selectedPlace.description }}</p>
            </div>

            <div class="detail-section">
              <div class="section-label">🕒 开放时间</div>
              <p class="section-text">{{ selectedPlace.open_hours || '暂未收录，欢迎同学补充' }}</p>
            </div>

            <div class="detail-section" v-if="detail.floors.length">
              <div class="section-label">🏢 楼层 & 店铺攻略</div>
              <div v-for="(f, fIdx) in detail.floors" :key="fIdx" class="floor-detail-block">
                <div class="floor-detail-head">{{ f.floorName }}</div>
                <div class="shop-detail-list">
                  <div v-for="(s, sIdx) in f.shops" :key="sIdx" class="shop-detail-row-wrap">
                    <div class="shop-detail-row">
                      <span class="shop-detail-name">
                        {{ s.shopName }}
                        <span v-if="s.recommend" class="rec-badge">🔥 推荐</span>
                      </span>
                      <span class="shop-detail-price" v-if="s.price">{{ s.price }}</span>
                    </div>
                    <p class="shop-detail-desc" v-if="s.desc">{{ s.desc }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="detail-section" v-if="detail.priceList.length">
              <div class="section-label">💰 价目表</div>
              <div v-for="(p, i) in detail.priceList" :key="i" class="price-row">
                <span>{{ p.item }}</span>
                <span class="price-value">{{ p.price }}</span>
              </div>
            </div>

            <div class="detail-section" v-if="detail.companies.length || detail.process">
              <div class="section-label">📦 快递信息</div>
              <div class="detail-chip-row" v-if="detail.companies.length">
                <span v-for="(c, i) in detail.companies" :key="i" class="detail-chip">{{ c }}</span>
              </div>
              <p class="section-text" v-if="detail.process">{{ detail.process }}</p>
              <p class="peak-hint" v-if="detail.peakHours">⚠️ 高峰期：{{ detail.peakHours }}，建议错峰取件</p>
            </div>

            <div class="detail-section" v-if="detail.studyZones.length">
              <div class="section-label">⭐ 分区评测（学生实测）</div>
              <div v-for="(z, i) in detail.studyZones" :key="i" class="zone-block">
                <div class="zone-head">
                  <span class="zone-name">{{ z.zone }}</span>
                  <span class="zone-stars">
                    <span v-for="n in 5" :key="n" class="zone-dot" :class="dotClass(z.rating, n)"></span>
                  </span>
                </div>
                <p class="zone-desc">{{ z.desc }}</p>
              </div>
            </div>

            <div class="detail-section tips-section" v-if="detail.tips">
              💡 {{ detail.tips }}
            </div>

            <div class="detail-footer">
              <button :class="['detail-fav-btn', isFav ? 'active' : '']" @click="toggleFavorite">
                {{ isFav ? '★ 已收藏' : '☆ 收藏' }}
              </button>
              <button class="detail-nav-btn" @click="locateOnMap(selectedPlace)">🧭 查看位置</button>
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
import { onMounted, ref, computed, nextTick } from 'vue';
import * as L from 'leaflet';
window.L = L;
import 'leaflet.heat';
import axios from 'axios';

// --- 基础配置 ---
const categories = ['全部', '餐饮', '快递', '学习', '生活', '交通', '其他'];
const roleNameMap = { guest: '游客', student: '河海学生', admin: '管理员' };

// 分类 -> 图标/主题色映射
const categoryMeta = {
  '餐饮': { icon: '🍜', color: '#f97316' },
  '快递': { icon: '📦', color: '#0ea5e9' },
  '学习': { icon: '📚', color: '#8b5cf6' },
  '生活': { icon: '🛍️', color: '#10b981' },
  '交通': { icon: '🚌', color: '#f59e0b' },
  '其他': { icon: '📍', color: '#6b7280' },
};
const catIcon = (cat) => categoryMeta[cat]?.icon || '📍';
const catColor = (cat) => categoryMeta[cat]?.color || '#6b7280';
const statusClass = (tag) => {
  if (tag === '高峰期') return 'busy';
  if (tag === '今日休息') return 'closed';
  return 'ok';
};
const dotClass = (rating, n) => {
  const r = Number(rating) || 0;
  if (r >= n) return 'full';
  if (r >= n - 0.5) return 'half';
  return 'empty';
};

// --- 状态管理 ---
const currentTab = ref('map');
const currentUserRole = ref('guest');
const tempSelectedRole = ref('guest');
const places = ref([]);
const searchKeyword = ref('');
const activeCategory = ref('全部');

// GIS操作状态
const isAddMode = ref(false);
const isRadarMode = ref(false);
const isHeatmapMode = ref(false);

const toastVisible = ref(false);
const toastMessage = ref('');

// 表单数据
const showForm = ref(false);
const emptyFloor = () => ({ floorName: '1楼', shops: [{ shopName: '', price: '', recommend: false }] });
const formData = ref({
  name: '', category: '餐饮', lng: '', lat: '', description: '', open_hours: '',
  highlights: '', tips: '',
  isComplex: false, floors: [emptyFloor()],
});

// 详情抽屉
const showDetail = ref(false);
const selectedPlace = ref(null);

// ========== 收藏功能（后端数据库） ==========
const favorites = ref([]);
const loadingFavorites = ref(false);

// ========== 我的贡献 ==========
const contributions = ref({ places: [], edits: [], notes: [] });
const loadingContributions = ref(false);

// 解析攻略
const parseStrategy = (item) => {
  const raw = item && item.strategy_data;
  if (!raw || typeof raw !== 'object') {
    return { highlights: [], tips: '', floors: [], priceList: [], companies: [], process: '', peakHours: '', studyZones: [] };
  }
  return {
    highlights: Array.isArray(raw.highlights) ? raw.highlights : [],
    tips: raw.tips || '',
    floors: (Array.isArray(raw.floors) ? raw.floors : []).filter(f => f && f.floorName && f.shops && f.shops.length),
    priceList: Array.isArray(raw.price_list) ? raw.price_list : [],
    companies: Array.isArray(raw.companies) ? raw.companies : [],
    process: raw.process || '',
    peakHours: raw.peak_hours || '',
    studyZones: Array.isArray(raw.study_zones) ? raw.study_zones : [],
  };
};
const getStrategy = (item) => parseStrategy(item);
const detail = computed(() => parseStrategy(selectedPlace.value || {}));

// 收藏状态（基于后端数据）
const isFav = computed(() => {
  if (!selectedPlace.value) return false;
  return favorites.value.some(f => f.place_id === selectedPlace.value.place_id);
});

const mapInstance = ref(null);
const markersGroup = ref(null);
const tempMarker = ref(null);
const bufferCircle = ref(null);
const heatLayer = ref(null);

// ========== 审核中心相关 ==========
const pendingPlaces = ref([]);
const loadingPending = ref(false);

// ========== 审核中心 Tab ==========
const auditTab = ref('pending');

// ========== 已上线地点管理 ==========
const approvedPlaces = ref([]);
const loadingApproved = ref(false);

const fetchPendingPlaces = async () => {
  console.log('🔍 进入 fetchPendingPlaces，当前角色:', currentUserRole.value);
  if (currentUserRole.value !== 'admin') {
    console.log('❌ 不是管理员，不加载');
    return;
  }
  loadingPending.value = true;
  try {
    const headers = { 'X-User-Role': 'admin' };
    console.log('📤 请求头:', headers);
    const response = await axios.get('http://localhost:3000/api/admin/pending', { headers });
    console.log('✅ 响应成功:', response.status, response.data);
    if (response.data.success) {
      pendingPlaces.value = response.data.data;
      console.log('📋 待审核列表:', pendingPlaces.value);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  } finally {
    loadingPending.value = false;
  }
};

const fetchApprovedPlaces = async () => {
  loadingApproved.value = true;
  try {
    const response = await axios.get('http://localhost:3000/api/admin/approved', {
      headers: { 'X-User-Role': 'admin' }
    });
    if (response.data.success) {
      approvedPlaces.value = response.data.data;
    }
  } catch (error) {
    console.error('获取已上线列表失败:', error);
  } finally {
    loadingApproved.value = false;
  }
};

const approvePlace = async (placeId) => {
  try {
    const response = await axios.put(
      `http://localhost:3000/api/admin/approve/${placeId}`,
      {},
      { headers: { 'X-User-Role': 'admin' } }
    );
    if (response.data.success) {
      showToast('✅ 已批准上线');
      fetchPendingPlaces();
      fetchApprovedPlaces();
      fetchPlaces();
    }
  } catch (error) {
    showToast('批准失败');
  }
};

const rejectPlace = async (placeId) => {
  if (!confirm('确定要驳回并删除这个地点吗？')) return;
  try {
    const response = await axios.delete(
      `http://localhost:3000/api/admin/reject/${placeId}`,
      { headers: { 'X-User-Role': 'admin' } }
    );
    if (response.data.success) {
      showToast('❌ 已驳回删除');
      fetchPendingPlaces();
      fetchApprovedPlaces();
      fetchPlaces();
    }
  } catch (error) {
    showToast('驳回失败');
  }
};

// ========== 删除地点（待审核或已上线均可） ==========
const deletePlace = async (placeId) => {
  if (!confirm('确定要删除这个地点吗？此操作不可恢复！')) return;
  try {
    const response = await axios.delete(
      `http://localhost:3000/api/admin/places/${placeId}`,
      { headers: { 'X-User-Role': 'admin' } }
    );
    if (response.data.success) {
      showToast('🗑️ 已删除地点');
      fetchPendingPlaces();
      fetchApprovedPlaces();
      fetchPlaces();
    }
  } catch (error) {
    console.error('删除失败:', error);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    showToast('删除失败');
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', { hour12: false });
};

// ========== 收藏功能方法 ==========
const fetchFavorites = async () => {
  if (currentUserRole.value === 'guest') {
    favorites.value = [];
    return;
  }
  loadingFavorites.value = true;
  try {
    const response = await axios.get('http://localhost:3000/api/user/favorites', {
      headers: { 'X-User-Role': currentUserRole.value }
    });
    if (response.data.success) {
      favorites.value = response.data.data;
    }
  } catch (error) {
    console.error('获取收藏列表失败:', error);
  } finally {
    loadingFavorites.value = false;
  }
};

const addFavorite = async (placeId) => {
  try {
    const response = await axios.post('http://localhost:3000/api/user/favorites', 
      { place_id: placeId },
      { headers: { 'X-User-Role': currentUserRole.value } }
    );
    if (response.data.success) {
      showToast('⭐ 已收藏');
      fetchFavorites();
    }
  } catch (error) {
    showToast('收藏失败');
  }
};

const removeFavorite = async (placeId) => {
  try {
    const response = await axios.delete(`http://localhost:3000/api/user/favorites/${placeId}`, {
      headers: { 'X-User-Role': currentUserRole.value }
    });
    if (response.data.success) {
      showToast('已取消收藏');
      fetchFavorites();
    }
  } catch (error) {
    showToast('取消收藏失败');
  }
};

// ========== 我的贡献方法 ==========
const fetchContributions = async () => {
  if (currentUserRole.value === 'guest') {
    contributions.value = { places: [], edits: [], notes: [] };
    return;
  }
  loadingContributions.value = true;
  try {
    const response = await axios.get('http://localhost:3000/api/user/contributions', {
      headers: { 'X-User-Role': currentUserRole.value }
    });
    console.log('📥 贡献数据响应:', response.data);
    if (response.data.success) {
      contributions.value = response.data.data;
      console.log('📊 贡献数据:', contributions.value);
    }
  } catch (error) {
    console.error('获取贡献列表失败:', error);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  } finally {
    loadingContributions.value = false;
  }
};

// ========== 收藏切换 ==========
const toggleFavorite = () => {
  if (!selectedPlace.value) return;
  if (currentUserRole.value === 'guest') { 
    showToast('游客暂不能收藏，请先切换身份'); 
    return; 
  }
  const id = selectedPlace.value.place_id;
  const isFav = favorites.value.some(f => f.place_id === id);
  if (isFav) {
    removeFavorite(id);
  } else {
    addFavorite(id);
  }
};

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
  } else if (tabName === 'user') {
    // 切换到“我的”时加载数据
    fetchFavorites();
    fetchContributions();
    if (currentUserRole.value === 'admin') {
      fetchPendingPlaces();
      fetchApprovedPlaces();
    }
    resetAllModes();
  } else {
    resetAllModes();
  }
};

const handleLogin = () => {
  currentUserRole.value = tempSelectedRole.value;
  showToast(`欢迎, ${roleNameMap[currentUserRole.value]}`);
  // 加载用户数据
  fetchFavorites();
  fetchContributions();
  if (currentUserRole.value === 'admin') {
    fetchPendingPlaces();
    fetchApprovedPlaces();
  }
  switchTab('map');
};

const resetAllModes = () => {
  isAddMode.value = false;
  isRadarMode.value = false;
  isHeatmapMode.value = false;
  removeTempLayers();
};

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

const toggleHeatmap = () => {
  isHeatmapMode.value = !isHeatmapMode.value;
  isAddMode.value = false;
  isRadarMode.value = false;
  removeTempLayers();

  if (isHeatmapMode.value) {
    if (markersGroup.value) mapInstance.value.removeLayer(markersGroup.value);
    const heatData = places.value.filter(p => p.lat && p.lng).map(p => [parseFloat(p.lat), parseFloat(p.lng), 1]);
    heatLayer.value = L.heatLayer(heatData, {
      radius: 25, blur: 15, maxZoom: 17,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(mapInstance.value);
    showToast('🔥 热力图已开启：颜色越暖代表设施越密集');
  } else {
    if (markersGroup.value) mapInstance.value.addLayer(markersGroup.value);
  }
};

const addFloor = () => { formData.value.floors.push(emptyFloor()); };
const removeFloor = (idx) => { formData.value.floors.splice(idx, 1); };
const addShopToFloor = (fIdx) => { formData.value.floors[fIdx].shops.push({ shopName: '', price: '', recommend: false }); };

const closeForm = () => {
  showForm.value = false;
  removeTempLayers();
};

const openDetail = (item) => {
  selectedPlace.value = item;
  showDetail.value = true;
};
const closeDetail = () => { showDetail.value = false; };

const removeTempLayers = () => {
  if (tempMarker.value && mapInstance.value) { mapInstance.value.removeLayer(tempMarker.value); tempMarker.value = null; }
  if (bufferCircle.value && mapInstance.value) { mapInstance.value.removeLayer(bufferCircle.value); bufferCircle.value = null; }
  if (heatLayer.value && mapInstance.value) {
    mapInstance.value.removeLayer(heatLayer.value); heatLayer.value = null;
    if (markersGroup.value && mapInstance.value && !mapInstance.value.hasLayer(markersGroup.value)) {
      mapInstance.value.addLayer(markersGroup.value);
    }
  }
};

const filterByCategory = (cat) => {
  activeCategory.value = cat;
  fetchPlaces();
  if (isHeatmapMode.value) {
    toggleHeatmap();
    setTimeout(toggleHeatmap, 50);
  }
};

// ---------- 网络请求 ----------
const fetchPlaces = async () => {
  try {
    let url = `http://localhost:3000/api/places?keyword=${searchKeyword.value}`;
    if (activeCategory.value !== '全部') url += `&category=${activeCategory.value}`;
    const response = await axios.get(url, {
      headers: { 'X-User-Role': currentUserRole.value }
    });
    places.value = response.data;
    renderMarkersOnMap();
  } catch (error) {
    showToast('数据拉取失败');
  }
};

const executeBufferAnalysis = (lat, lng) => {
  removeTempLayers();
  bufferCircle.value = L.circle([lat, lng], {
    color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.15, radius: 200, weight: 2
  }).addTo(mapInstance.value);

  let count = 0;
  places.value.forEach(p => {
    if (p.lat && p.lng) {
      const distance = mapInstance.value.distance([lat, lng], [p.lat, p.lng]);
      if (distance <= 200) count++;
    }
  });
  showToast(`📍 探测完成：200米生活圈内共有 ${count} 个便民设施`);
  mapInstance.value.fitBounds(bufferCircle.value.getBounds(), { padding: [50, 50] });
};

const renderMarkersOnMap = () => {
  if (!mapInstance.value || !markersGroup.value) return;
  markersGroup.value.clearLayers();

  places.value.forEach(place => {
    if (place.lat && place.lng) {
      const strategy = parseStrategy(place);
      const highlightHtml = strategy.highlights.length
        ? `<div class="cp-chip-row">${strategy.highlights.slice(0, 3).map(h => `<span class="cp-chip">✦ ${h}</span>`).join('')}</div>`
        : '';

      const popupHtml = `
        <div class="custom-popup">
          <div class="cp-head">
            <h4 class="cp-title">${place.name}</h4>
            <span class="cp-cat" style="background:${catColor(place.category)}22;color:${catColor(place.category)}">${place.category}</span>
          </div>
          ${place.description ? `<p class="cp-desc">${place.description}</p>` : ''}
          ${highlightHtml}
          <button type="button" class="cp-detail-btn">查看完整攻略 ➔</button>
        </div>
      `;

      const marker = L.marker([place.lat, place.lng]).bindPopup(popupHtml, { minWidth: 200, maxWidth: 260 });
      marker.on('popupopen', (e) => {
        const el = e.popup.getElement();
        const btn = el && el.querySelector('.cp-detail-btn');
        if (btn) btn.onclick = () => openDetail(place);
      });
      marker.addTo(markersGroup.value);
    }
  });
};

const submitNewPlace = async () => {
  if (!formData.value.name.trim()) { showToast('设施名称为必填项'); return; }

  const cleanedFloors = formData.value.floors.map(f => ({
    floorName: f.floorName,
    shops: f.shops
      .filter(s => s.shopName.trim() !== '')
      .map(s => ({ shopName: s.shopName.trim(), price: s.price ? s.price.trim() : '', recommend: !!s.recommend }))
  })).filter(f => f.floorName.trim() !== '' && f.shops.length > 0);

  const highlightsArr = formData.value.highlights.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
  const tipsText = formData.value.tips.trim();

  let strategy_data = null;
  if ((formData.value.isComplex && cleanedFloors.length) || highlightsArr.length || tipsText) {
    strategy_data = {};
    if (formData.value.isComplex && cleanedFloors.length) strategy_data.floors = cleanedFloors;
    if (highlightsArr.length) strategy_data.highlights = highlightsArr;
    if (tipsText) strategy_data.tips = tipsText;
  }

  try {
    const payload = {
      name: formData.value.name, category: formData.value.category, lng: formData.value.lng, lat: formData.value.lat,
      description: formData.value.description, open_hours: formData.value.open_hours,
      strategy_data
    };

    const response = await axios.post('http://localhost:3000/api/places', payload, {
      headers: { 'X-User-Role': currentUserRole.value }
    });
    if (response.data.success) {
      showToast('🎉 提交成功！' + (response.data.is_approved ? ' 已上线' : ' 等待管理员审核'));
      showForm.value = false;
      resetAllModes();
      fetchPlaces();
    }
  } catch (error) {
    showToast('保存失败');
  }
};

const locateOnMap = (item) => {
  showDetail.value = false;
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

// --- 生命周期 ---
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

    if (isAddMode.value && (currentUserRole.value === 'student' || currentUserRole.value === 'admin')) {
      formData.value.lat = lat.toFixed(6);
      formData.value.lng = lng.toFixed(6);
      formData.value.name = ''; formData.value.description = ''; formData.value.open_hours = '';
      formData.value.highlights = ''; formData.value.tips = '';
      formData.value.isComplex = false;
      formData.value.floors = [emptyFloor()];

      removeTempLayers();
      tempMarker.value = L.circleMarker([lat, lng], { color: '#ef4444', radius: 8, fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }).addTo(mapInstance.value);
      showForm.value = true;
    }
  });

  fetchPlaces();
  fetchFavorites();
  fetchContributions();
  if (currentUserRole.value === 'admin') {
    fetchPendingPlaces();
    fetchApprovedPlaces();
  }
});
</script>

<style>
/* ================== 基础样式 ================== */
html, body {
  margin: 0; padding: 0;
  width: 100vw; height: 100vh;
  background: #e5e7eb;
  display: flex; align-items: center; justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased; user-select: none;
}

#app { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }

.native-app-container {
  width: 100%; height: 100vh; height: 100dvh;
  max-width: 420px;
  background: #f2f2f7; display: flex; flex-direction: column; position: relative;
}

@media (min-width: 480px) {
  .native-app-container {
    height: 850px; max-height: 90vh;
    border-radius: 40px;
    box-shadow: 0 24px 48px rgba(0,0,0,0.15);
    border: 10px solid #1f2937;
    overflow: hidden;
  }
}

/* ===== 顶部 Header ===== */
.native-header { height: 50px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 0.5px solid rgba(0,0,0,0.1); z-index: 100; flex-shrink: 0; }
.header-content { display: flex; justify-content: space-between; align-items: center; height: 100%; padding: 0 16px; gap: 12px; }

.app-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  padding: 4px 0;
  letter-spacing: 0.8px;
  white-space: nowrap;
}

.role-indicator { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 12px; background: #e5e5ea; color: #8e8e93; flex-shrink: 0; }
.role-indicator.admin { background: #e0f2fe; color: #0284c7; }
.role-indicator.student { background: #dcfce7; color: #166534; }
.pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.native-toast { position: absolute; top: 60px; left: 50%; transform: translateX(-50%) translateY(-20px) scale(0.95); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 500; opacity: 0; pointer-events: none; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); white-space: nowrap; }
.native-toast.show { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }

.native-content { flex: 1; position: relative; overflow: hidden; width: 100%; }
.native-view { position: absolute; inset: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.bg-light { background: #f2f2f7; }
.flex-center { display: flex; align-items: center; justify-content: center; }

/* ===== 地图与工具 ===== */
#map-wrapper, #map { width: 100%; height: 100%; position: absolute; inset: 0; }
.hidden-view { opacity: 0; pointer-events: none; }

.glass-filters {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 4px 10px 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  box-sizing: border-box;
  min-width: 0;
}
.glass-filters::-webkit-scrollbar { display: none; }
.filter-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(10px);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #3c3c43;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  white-space: nowrap;
  transition: 0.2s;
  cursor: pointer;
  flex-shrink: 0;
}
.filter-chip.active { background: #007aff; color: white; }
.filter-chip.active .chip-dot { background: white !important; }
.chip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.side-tools { position: absolute; bottom: 24px; right: 16px; z-index: 1000; display: flex; flex-direction: column; gap: 12px; }
.tool-btn { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border: none; padding: 10px 16px; border-radius: 24px; font-size: 13px; font-weight: 600; color: #3c3c43; box-shadow: 0 4px 12px rgba(0,0,0,0.1); cursor: pointer; transition: 0.2s; }
.tool-btn.heat-active { background: #f97316; color: white; }
.tool-btn.radar-active { background: #0ea5e9; color: white; }
.tool-btn.add-active { background: #ef4444; color: white; }
.tool-icon { font-size: 16px; }

/* ===== 攻略列表 ===== */
.search-header { padding: 12px 16px; background: #fff; position: sticky; top: 0; z-index: 10; border-bottom: 0.5px solid rgba(0,0,0,0.05); }
.search-input { width: 100%; background: #e3e3e8; border: none; padding: 10px 14px; border-radius: 10px; font-size: 15px; outline: none; box-sizing: border-box; color: #1f2937; }
.scroll-list { padding: 16px; padding-bottom: 40px; }
.empty-state { text-align: center; color: #8e8e93; font-size: 14px; margin-top: 40px; }

.p-card { background: #fff; border-radius: 18px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.p-card:active { transform: scale(0.98); box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
.p-card-top { display: flex; align-items: center; gap: 12px; }

.p-orbit-icon { position: relative; width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--ring-color) 14%, white); }
.p-orbit-ring { position: absolute; inset: -4px; border-radius: 50%; border: 1.5px dashed var(--ring-color); opacity: 0.55; animation: orbit-spin 18s linear infinite; }
.p-orbit-emoji { font-size: 19px; position: relative; z-index: 1; }
@keyframes orbit-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .p-orbit-ring, .hero-orbit-ring { animation: none !important; } }

.p-card-info { flex: 1; min-width: 0; }
.p-card-title-row { display: flex; align-items: center; gap: 6px; }
.p-card-title { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-card-sub { font-size: 12px; color: #8e8e93; font-weight: 500; }
.p-card-chevron { font-size: 20px; color: #c7c7cc; font-weight: 300; }

.p-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.p-status-dot.ok { background: #34c759; }
.p-status-dot.busy { background: #ff9500; }
.p-status-dot.closed { background: #ff3b30; }

.p-card-desc { font-size: 13px; color: #8e8e93; margin: 10px 0 0 0; }
.p-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.p-chip { font-size: 11px; font-weight: 600; color: #007aff; background: #e8f2ff; padding: 3px 9px; border-radius: 20px; }

.card-foot { display: flex; justify-content: space-between; align-items: center; border-top: 0.5px solid #e5e5ea; padding-top: 10px; margin-top: 12px; }
.card-time { font-size: 12px; color: #8e8e93; }
.card-action { font-size: 13px; color: #007aff; font-weight: 600; cursor: pointer; }

/* ===== 用户中心 ===== */
.profile-card { background: #fff; border-radius: 20px; width: 85%; padding: 30px 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); text-align: center; }
.avatar-box { width: 70px; height: 70px; background: #e5e5ea; border-radius: 50%; margin: 0 auto 16px auto; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238e8e93"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'); background-size: 60%; background-repeat: no-repeat; background-position: center; }
.profile-title { font-size: 18px; font-weight: 600; margin: 0 0 24px 0; color: #1f2937; }
.native-select { width: 100%; background: #f2f2f7; border: none; padding: 14px; border-radius: 12px; font-size: 16px; margin-bottom: 16px; outline: none; -webkit-appearance: none; text-align: center; color: #007aff; font-weight: 600; }
.primary-btn { width: 100%; background: #007aff; color: white; border: none; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; }

/* ================= Bottom Sheet ================= */
.bottom-sheet-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.3); z-index: 2000; opacity: 0; pointer-events: none; transition: 0.3s; display: flex; flex-direction: column; justify-content: flex-end; }
.bottom-sheet-bg.show { opacity: 1; pointer-events: auto; }
.bottom-sheet { width: 100%; background: #f2f2f7; border-radius: 20px 20px 0 0; transform: translateY(100%); transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; max-height: 85vh; }
.bottom-sheet-bg.show .bottom-sheet { transform: translateY(0); }
.drag-bar { width: 36px; height: 5px; background: #c7c7cc; border-radius: 3px; margin: 10px auto; flex-shrink: 0; }
.sheet-header { display: flex; justify-content: space-between; align-items: center; padding: 0 16px 14px 16px; border-bottom: 0.5px solid #e5e5ea; }
.sheet-title { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;}
.action-text { font-size: 16px; font-weight: 500; cursor: pointer; }
.action-text.cancel { color: #8e8e93; }
.action-text.submit { color: #007aff; font-weight: 600; }
.sheet-scroll-body { overflow-y: auto; padding: 16px; -webkit-overflow-scrolling: touch; }

.input-block { background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
.large-input, .std-input, .std-textarea, .floor-name-input, .shop-input, .shop-price-input { color: #1f2937 !important; background: transparent; font-family: inherit; }
.large-input { width: 100%; border: none; border-bottom: 0.5px solid #e5e5ea; padding: 16px; font-size: 16px; font-weight: 600; outline: none; box-sizing: border-box; }
.row-inputs { display: flex; border-bottom: 0.5px solid #e5e5ea; }
.std-input { width: 100%; border: none; padding: 14px 16px; font-size: 15px; outline: none; box-sizing: border-box; }
.row-inputs .std-input:first-child { border-right: 0.5px solid #e5e5ea; }
.std-input:not(.row-inputs .std-input) { border-bottom: 0.5px solid #e5e5ea; }
.std-textarea { width: 100%; border: none; padding: 14px 16px; font-size: 14px; outline: none; box-sizing: border-box; resize: none; height: 60px; }

.seg-control { display: flex; background: #e3e3e8; padding: 3px; border-radius: 9px; margin-bottom: 16px; }
.seg-btn { flex: 1; text-align: center; padding: 8px 0; font-size: 14px; font-weight: 500; color: #8e8e93; border-radius: 7px; transition: 0.2s; cursor: pointer; }
.seg-btn.active { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 600; color: #1f2937; }

.floor-box { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 12px; }
.floor-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 0.5px dashed #e5e5ea; padding-bottom: 8px; margin-bottom: 10px; }
.floor-name-input { border: none; font-size: 15px; font-weight: 600; color: #007aff !important; outline: none; width: 70%; }
.del-btn { font-size: 13px; color: #ff3b30; cursor: pointer; }
.shop-grid { display: flex; flex-direction: column; gap: 8px; }
.shop-row { display: flex; align-items: center; gap: 6px; }
.shop-input { flex: 1.4; border: 1px solid #e5e5ea; border-radius: 8px; padding: 8px 10px; font-size: 14px; box-sizing: border-box; outline: none; min-width: 0; }
.shop-price-input { flex: 1; border: 1px solid #e5e5ea; border-radius: 8px; padding: 8px 10px; font-size: 14px; box-sizing: border-box; outline: none; min-width: 0; }
.shop-rec-toggle { flex-shrink: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: #f2f2f7; opacity: 0.4; cursor: pointer; transition: 0.2s; }
.shop-rec-toggle.active { background: #fff3e0; opacity: 1; }
.add-shop-btn { width: 100%; border: 1px dashed #007aff; background: transparent; color: #007aff; border-radius: 8px; font-size: 13px; padding: 8px 0; cursor: pointer; }
.add-floor-btn { width: 100%; border: none; background: transparent; color: #007aff; font-size: 15px; font-weight: 600; padding: 10px 0; cursor: pointer; }

/* ================= 详情抽屉 ================= */
.detail-sheet-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.35); z-index: 2500; opacity: 0; pointer-events: none; transition: 0.3s; display: flex; flex-direction: column; justify-content: flex-end; }
.detail-sheet-bg.show { opacity: 1; pointer-events: auto; }
.detail-sheet { width: 100%; height: 58%; background: #fff; border-radius: 22px 22px 0 0; transform: translateY(100%); transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; box-shadow: 0 -8px 30px rgba(0,0,0,0.12); }
.detail-sheet-bg.show .detail-sheet { transform: translateY(0); }
.detail-scroll { overflow-y: auto; padding: 4px 20px 24px; -webkit-overflow-scrolling: touch; }

.detail-hero { display: flex; align-items: flex-start; gap: 14px; padding: 8px 0 4px; }
.hero-orbit-icon { position: relative; width: 60px; height: 60px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--ring-color) 16%, white); }
.hero-orbit-ring { position: absolute; inset: -5px; border-radius: 50%; border: 1.5px dashed var(--ring-color); opacity: 0.6; animation: orbit-spin 18s linear infinite; }
.hero-orbit-ring.ring-2 { inset: -10px; opacity: 0.3; animation-duration: 26s; animation-direction: reverse; }
.hero-emoji { font-size: 26px; position: relative; z-index: 1; }

.hero-info { flex: 1; min-width: 0; padding-top: 2px; }
.hero-title { margin: 0 0 6px 0; font-size: 19px; font-weight: 700; color: #1f2937; }
.hero-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hero-cat-badge { font-size: 11px; font-weight: 700; color: #fff; padding: 3px 10px; border-radius: 20px; }
.hero-status { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #8e8e93; }
.hero-close { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; background: #f2f2f7; color: #8e8e93; display: flex; align-items: center; justify-content: center; font-size: 13px; cursor: pointer; }

.detail-chip-row { display: flex; flex-wrap: wrap; gap: 7px; margin: 14px 0 4px; }
.detail-chip { font-size: 12px; font-weight: 600; color: #007aff; background: #e8f2ff; padding: 5px 12px; border-radius: 20px; }

.detail-section { margin-top: 20px; }
.section-label { font-size: 13px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
.section-text { font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0; }

.floor-detail-block { background: #f8fafc; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
.floor-detail-head { font-size: 13px; font-weight: 700; color: #007aff; margin-bottom: 6px; }
.shop-detail-list { display: flex; flex-direction: column; gap: 6px; }
.shop-detail-row-wrap { padding: 4px 0; border-bottom: 0.5px dashed #e5e5ea; }
.shop-detail-row-wrap:last-child { border-bottom: none; }
.shop-detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #1f2937; }
.shop-detail-name { display: flex; align-items: center; gap: 6px; }
.shop-detail-price { color: #ff9500; font-weight: 700; }
.shop-detail-desc { margin: 4px 0 0 0; font-size: 12px; color: #8e8e93; line-height: 1.5; }
.rec-badge { font-size: 10px; font-weight: 700; color: #ea580c; background: #fff3e0; padding: 2px 6px; border-radius: 8px; }

.price-row { display: flex; justify-content: space-between; font-size: 14px; color: #1f2937; padding: 8px 0; border-bottom: 0.5px solid #f2f2f7; }
.price-row:last-child { border-bottom: none; }
.price-value { color: #ff9500; font-weight: 700; }

.peak-hint { font-size: 12px; color: #ea580c; background: #fff7ed; padding: 8px 10px; border-radius: 10px; margin: 8px 0 0; }

.zone-block { padding: 10px 0; border-bottom: 0.5px dashed #e5e5ea; }
.zone-block:last-child { border-bottom: none; }
.zone-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.zone-name { font-size: 13px; font-weight: 700; color: #1f2937; }
.zone-stars { display: flex; gap: 3px; flex-shrink: 0; }
.zone-dot { width: 9px; height: 9px; border-radius: 50%; border: 1.4px solid #f59e0b; box-sizing: border-box; }
.zone-dot.full { background: #f59e0b; }
.zone-dot.half { background: linear-gradient(90deg, #f59e0b 50%, transparent 50%); }
.zone-dot.empty { background: transparent; opacity: 0.4; }
.zone-desc { margin: 6px 0 0 0; font-size: 12.5px; color: #6b7280; line-height: 1.6; }

.tips-section { background: #fffbeb; border-radius: 12px; padding: 12px 14px; font-size: 13px; color: #92400e; line-height: 1.6; }

.detail-footer { display: flex; gap: 10px; margin-top: 24px; padding-top: 4px; }
.detail-fav-btn { flex: 1; border: 1.5px solid #e5e5ea; background: #fff; color: #1f2937; padding: 12px 0; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.detail-fav-btn.active { border-color: #ff9500; color: #ff9500; background: #fff7ed; }
.detail-nav-btn { flex: 1.4; border: none; background: #007aff; color: #fff; padding: 12px 0; border-radius: 14px; font-size: 14px; font-weight: 600; cursor: pointer; }

/* ===== 底部导航栏 ===== */
.native-tabbar { height: 50px; background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-top: 0.5px solid rgba(0,0,0,0.1); display: flex; justify-content: space-around; padding-bottom: env(safe-area-inset-bottom); z-index: 100; flex-shrink: 0; }
.tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: #8e8e93; transition: 0.2s; width: 60px; cursor: pointer; }
.tab-icon { font-size: 20px; filter: grayscale(1); opacity: 0.6; }
.tab span { font-size: 10px; font-weight: 500; }
.tab.active { color: #007aff; }
.tab.active .tab-icon { filter: grayscale(0); opacity: 1; }

/* ===== Leaflet 地图气泡 ===== */
.leaflet-popup-content-wrapper { border-radius: 14px; padding: 0; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.leaflet-popup-content { margin: 0; }
.custom-popup { padding: 14px; }
.cp-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; }
.cp-title { margin: 0; font-size: 15px; font-weight: 600; color: #1f2937; }
.cp-cat { font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 700; flex-shrink: 0; }
.cp-desc { margin: 0 0 10px 0; font-size: 12px; color: #8e8e93; }
.cp-chip-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.cp-chip { font-size: 10px; font-weight: 600; color: #007aff; background: #e8f2ff; padding: 2px 8px; border-radius: 10px; }
.cp-detail-btn { width: 100%; border: none; background: #007aff; color: #fff; padding: 9px 0; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; }

/* ================= 审核中心样式 ================= */
.audit-center {
  margin-top: 16px;
  padding: 0 16px 16px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px 12px 0 0;
  border-bottom: 0.5px solid #e5e5ea;
}

.audit-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.audit-count {
  font-size: 12px;
  font-weight: 600;
  color: #007aff;
  background: #e8f2ff;
  padding: 2px 10px;
  border-radius: 12px;
}

.audit-loading,
.audit-empty {
  padding: 30px 16px;
  text-align: center;
  background: #fff;
  border-radius: 0 0 12px 12px;
  color: #8e8e93;
  font-size: 14px;
}

.audit-card {
  background: #fff;
  border-radius: 0;
  padding: 14px 16px;
  border-bottom: 0.5px solid #f2f2f7;
}

.audit-card:last-child {
  border-radius: 0 0 12px 12px;
}

.audit-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.audit-card-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.audit-card-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.audit-card-cat {
  font-size: 11px;
  font-weight: 600;
  color: #007aff;
  background: #e8f2ff;
  padding: 2px 8px;
  border-radius: 6px;
}

.audit-card-time {
  font-size: 11px;
  color: #8e8e93;
}

.audit-card-body {
  margin-bottom: 10px;
}

.audit-card-desc {
  margin: 0 0 6px 0;
  font-size: 13px;
  color: #4b5563;
}

.audit-card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #8e8e93;
}

.audit-card-actions {
  display: flex;
  gap: 10px;
}

.audit-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.audit-btn.approve {
  background: #dcfce7;
  color: #166534;
}

.audit-btn.approve:hover {
  background: #bbf7d0;
}

.audit-btn.reject {
  background: #fee2e2;
  color: #991b1b;
}

.audit-btn.reject:hover {
  background: #fecaca;
}

.audit-btn.delete {
  background: #fee2e2;
  color: #991b1b;
}

.audit-btn.delete:hover {
  background: #fecaca;
}

/* ===== 审核中心 Tab 样式 ===== */
.audit-tabs {
  display: flex;
  background: #fff;
  border-radius: 12px 12px 0 0;
  border-bottom: 0.5px solid #e5e5ea;
  overflow: hidden;
}

.audit-tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #8e8e93;
  cursor: pointer;
  transition: 0.2s;
  position: relative;
}

.audit-tab.active {
  color: #007aff;
  font-weight: 600;
}

.audit-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2.5px;
  background: #007aff;
  border-radius: 2px;
}

.tab-badge {
  display: inline-block;
  background: #e5e5ea;
  color: #8e8e93;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 10px;
  margin-left: 4px;
}

.audit-tab.active .tab-badge {
  background: #e8f2ff;
  color: #007aff;
}

.audit-card-status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}
.audit-card-status.approved {
  color: #166534;
  background: #dcfce7;
}

/* ================= 我的模块样式 ================= */
.my-section {
  margin-top: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px 8px 12px;
  background: #fff;
  border-radius: 12px 12px 0 0;
  border-bottom: 0.5px solid #e5e5ea;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.section-count {
  font-size: 12px;
  font-weight: 500;
  color: #8e8e93;
}

.section-loading {
  padding: 16px 12px;
  text-align: center;
  background: #fff;
  color: #8e8e93;
  font-size: 13px;
}

.section-empty {
  padding: 16px 12px;
  text-align: center;
  background: #fff;
  border-radius: 0 0 12px 12px;
  color: #8e8e93;
  font-size: 13px;
}

.my-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #fff;
  border-bottom: 0.5px solid #f2f2f7;
  cursor: pointer;
  transition: 0.15s;
}
.my-card:active {
  background: #f2f2f7;
}
.my-card:last-child {
  border-radius: 0 0 12px 12px;
}

.my-card-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.my-card-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-card-cat {
  font-size: 11px;
  font-weight: 600;
  color: #007aff;
  background: #e8f2ff;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.my-card-status {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}
.my-card-status.approved {
  color: #166534;
  background: #dcfce7;
}
.my-card-status.pending {
  color: #92400e;
  background: #fffbeb;
}

.my-card-unfav {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #f2f2f7;
  color: #8e8e93;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: 0.2s;
}
.my-card-unfav:hover {
  background: #fee2e2;
  color: #ef4444;
}
</style>