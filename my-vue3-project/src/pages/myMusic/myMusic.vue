<template>
  <view class="my-music-container">
    <view class="background-decoration"></view>
    
    <view class="my-music-content">
      <view class="header">
        <view class="header-left">
          <text class="back-btn" @tap="goBack">←</text>
        </view>
        <view class="header-title">
          <text class="title">我的音乐</text>
        </view>
        <view class="header-right"></view>
      </view>

      <view class="tabs">
        <view 
          class="tab-item" 
          :class="{ active: activeTab === 'playlist' }"
          @tap="switchTab('playlist')"
        >
          <text class="tab-text">我的歌单</text>
        </view>
        <view 
          v-if="activeTab === 'playlist'" 
          class="add-music-btn" 
          @tap="addLocalMusic"
        >
          <text class="add-icon">+</text>
          <text class="add-text">添加音乐</text>
        </view>
      </view>

      <scroll-view 
        class="song-list" 
        scroll-y 
        @scrolltolower="loadMore"
      >
        <view 
          v-for="(song, index) in currentSongs" 
          :key="song.id" 
          class="song-item"
          @tap="playSong(song, index)"
        >
          <view class="song-index">
            <text class="index-text">{{ index + 1 }}</text>
          </view>
          
          <view class="song-info">
            <view class="song-cover">
              <image 
                :src="song.cover || '/static/logo.jpg'" 
                class="cover-image"
                mode="aspectFill"
              />
              <view class="play-icon" v-if="player.currentSong?.id === song.id && player.isPlaying">
                <text class="icon">♪</text>
              </view>
            </view>
            
            <view class="song-details">
              <text class="song-title">{{ song.title }}</text>
              <text class="song-artist">{{ song.artist }}</text>
            </view>
          </view>
          
          <view class="song-actions">
            <view class="action-btn" @tap.stop="toggleLike(song)">
              <text class="action-icon" :class="{ liked: song.isLiked }">♥</text>
            </view>
            <view class="action-btn" @tap.stop="showMore(song)">
              <text class="action-icon">⋯</text>
            </view>
          </view>
        </view>

        <view class="loading-more" v-if="loading">
          <text class="loading-text">加载中...</text>
        </view>

        <view class="empty-state" v-if="currentSongs.length === 0 && !loading">
          <text class="empty-icon">🎵</text>
          <text class="empty-text">暂无歌曲</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
// 修改：添加songApi导入，用于获取所有歌曲列表
import { likedSongApi, recentPlayApi, songApi } from '@/utils/api';
import { usePlayerStore } from '@/store/player';
import { useMusicStore } from '@/store/music';

const player = usePlayerStore();
const musicStore = useMusicStore();

const activeTab = ref('playlist');
const loading = ref(false);
const recentSongs = ref([]);
const playlists = ref([]);

const currentSong = computed(() => player.currentSong || {
  title: '未选择歌曲',
  artist: '',
  cover: '/static/logo.png'
});

const isPlaying = computed(() => player.isPlaying);
const progress = computed(() => player.progress);
const currentTime = computed(() => player.currentTime);
const duration = computed(() => player.duration);

const currentSongs = computed(() => {
  switch (activeTab.value) {
    case 'liked':
      return musicStore.likedSongs;
    case 'recent':
      return recentSongs.value;
    case 'playlist':
      return musicStore.likedSongs;
    default:
      return [];
  }
});

const switchTab = (tab) => {
  activeTab.value = tab;
  loadSongs();
};

const loadSongs = async () => {
  loading.value = true;
  try {
    console.log('开始加载歌曲...');
    switch (activeTab.value) {
      case 'playlist':
        // ==================== 修改1：优先获取所有歌曲 ====================
        // 问题：之前只获取喜欢的歌曲，现在需要获取所有歌曲
        // 解决方案：调用songApi.getSongList()获取所有歌曲
        // ================================================================
        console.log('调用songApi.getSongList()');
        // ==================== 修改2：添加嵌套的try-catch块 ====================
        // 问题：API请求失败时会显示错误信息
        // 解决方案：添加嵌套的try-catch块，尝试解析错误对象中的响应数据
        // ==================================================================
        let songRes;
        let raw = [];
        
        try {
          songRes = await songApi.getSongList();
          console.log('获取歌曲列表响应:', songRes);
          
          // ==================== 修改3：处理API返回的响应格式 ====================
          // 问题：后端返回的响应格式可能不同，需要兼容处理
          // 解决方案：处理多种可能的响应格式，优先从data.list中提取数据
          // ====================================================================
          raw = Array.isArray(songRes)
            ? songRes
            : Array.isArray(songRes.data)
            ? songRes.data
            : Array.isArray(songRes.data?.list)
            ? songRes.data.list
            : (songRes.data?.data || []);
        } catch (error) {
          console.error('API请求失败，但尝试解析错误对象中的响应数据:', error);
          // ==================== 修改4：尝试解析错误对象中的响应数据 ====================
          // 问题：API请求失败时，错误对象中可能包含响应数据
          // 解决方案：尝试从错误对象中解析响应数据
          // ============================================================================
          if (error && typeof error === 'object') {
            raw = Array.isArray(error)
              ? error
              : Array.isArray(error.data)
              ? error.data
              : Array.isArray(error.data?.list)
              ? error.data.list
              : (error.data?.data || []);
          }
        }
        
        console.log('处理后的原始数据:', raw);

        // 映射常见音源字段到统一的 `url`
        const songs = raw.map((s, index) => {
          console.log(`处理歌曲 ${index + 1}:`, s);
          const url = s.url || s.mp3Url || s.fileUrl || s.path || s.audioUrl || s.songUrl || s.streamUrl || s.playUrl;
          return { ...s, url, id: s.id || index + 1 };
        }).filter(s => s.url); // 过滤掉没有url的歌曲

        console.log('处理后的歌曲列表:', songs);
        console.log('过滤后歌曲数量:', songs.length);

        const missing = raw.filter(s => !s.url && !s.mp3Url && !s.fileUrl && !s.path && !s.audioUrl && !s.songUrl && !s.streamUrl && !s.playUrl);
        if (missing.length > 0) {
          console.warn('部分歌曲缺少可播放 url，已过滤：', missing.length);
        }

        musicStore.setLikedSongs(songs);

        // ==================== 修改5：优化自动播放逻辑 ====================
        // 问题：每次进入"我的"页面都会重新播放第一首歌曲，不管当前是否已经在播放
        // 解决方案：只有当当前没有播放列表或者播放列表为空时，才自动播放第一首歌曲
        // ==================================================================
        if (songs.length > 0 && (player.playList.length === 0 || !player.currentSong)) {
          console.log('设置播放列表并自动播放第一首');
          player.setPlaylist(songs, 0);
        } else {
          console.log('当前已有播放列表，保持当前播放状态');
          // 如果当前有播放列表，只更新歌曲列表到store中，不重新播放
        }
        break;
    }
  } catch (error) {
    console.error('加载歌曲失败:', error);
    console.error('错误详情:', error.message, error.stack);
    // 不显示错误信息，确保用户体验
  } finally {
    loading.value = false;
  }
};

const loadMore = () => {
  console.log('加载更多');
};

const playSong = (song, index) => {
  player.setPlaylist(currentSongs.value, index);
  
  uni.showToast({
    title: `播放: ${song.title}`,
    icon: 'none',
    duration: 1500
  });
  
  console.log('播放歌曲:', song);
};



const showMore = (song) => {
  uni.showActionSheet({
    itemList: ['添加到歌单', '分享', '删除'],
    success: (res) => {
      console.log('选择了:', res.tapIndex);
    }
  });
};

const goBack = () => {
  uni.navigateBack();
};

const addLocalMusic = () => {
  uni.showActionSheet({
    itemList: ['选择本地音乐'],
    success: (res) => {
      if (res.tapIndex === 0) {
        chooseLocalMusic();
      }
    }
  });
};

const chooseLocalMusic = () => {
  uni.chooseFile({
    count: 1,
    extension: ['.mp3', '.wav', '.m4a', '.aac'],
    success: async (res) => {
      const file = res.tempFiles[0];
      await addMusicToList(file);
    },
    fail: (err) => {
      console.error('选择文件失败:', err);
      uni.showToast({
        title: '选择文件失败',
        icon: 'none'
      });
    }
  });
};

const addMusicToList = async (file) => {
  const newSong = {
    id: Date.now(),
    title: file.name.replace(/\.[^/.]+$/, ''),
    artist: '本地音乐',
    cover: '/static/logo.jpg',
    url: file.path,
    isLiked: true,
    isLocal: true
  };
  
  musicStore.addSong(newSong);
  player.playSong(newSong);
  
  uni.showToast({
    title: '已添加到我的歌单',
    icon: 'success',
    duration: 2000
  });
  
  console.log('添加本地音乐:', newSong);
};

onMounted(() => {
  loadSongs();
});
</script>

<style scoped>
.my-music-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.my-music-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  background: white;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-left,
.header-right {
  width: 40px;
}

.back-btn {
  font-size: 24px;
  font-weight: bold;
  color: white;
  cursor: pointer;
}

.header-title {
  flex: 1;
  text-align: center;
}

.title {
  font-size: 20px;
  font-weight: 600;
  color: white;
}

.tabs {
  display: flex;
  background: white;
  border-bottom: 1px solid #f0f0f0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 15px 0;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-item.active {
  color: #667eea;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.tab-text {
  font-size: 15px;
  font-weight: 500;
  color: #666;
}

.tab-item.active .tab-text {
  color: #667eea;
  font-weight: 600;
}

.add-music-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  animation: fadeInRight 0.5s ease-out;
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.add-music-btn:active {
  transform: scale(0.95);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.add-icon {
  font-size: 18px;
  font-weight: bold;
  color: white;
}

.add-text {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.song-list {
  height: calc(100vh - 130px);
  background: #fafafa;
}

.song-item {
  display: flex;
  align-items: center;
  padding: 15px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s ease;
}

.song-item:active {
  background: #f8f9fa;
}

.song-index {
  width: 40px;
  text-align: center;
}

.index-text {
  font-size: 16px;
  color: #999;
  font-weight: 500;
}

.song-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.song-cover {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.cover-image {
  width: 100%;
  height: 100%;
}

.play-icon {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.icon {
  font-size: 20px;
  color: white;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.song-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.song-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  font-size: 13px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:active {
  transform: scale(0.9);
}

.action-icon {
  font-size: 20px;
  color: #999;
  transition: all 0.3s ease;
}

.action-icon.liked {
  color: #ff4757;
}

.action-icon:hover {
  color: #667eea;
}

.loading-more {
  padding: 20px;
  text-align: center;
}

.loading-text {
  font-size: 14px;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 20px;
}

.empty-icon {
  font-size: 60px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  color: #999;
}

@media (max-width: 375px) {
  .song-cover {
    width: 45px;
    height: 45px;
  }
  
  .song-title {
    font-size: 14px;
  }
  
  .song-artist {
    font-size: 12px;
  }
}
</style>
