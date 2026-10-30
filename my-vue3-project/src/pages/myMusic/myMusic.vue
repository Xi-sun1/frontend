<template>
  <view class="my-music-container">
    <view class="bg-glow glow-a"></view>
    <view class="bg-glow glow-b"></view>

    <view class="my-music-content">
      <view class="header">
        <view class="back-btn" role="button" aria-label="返回" @tap="goBack">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5L8 12L15 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </view>
        <view class="header-title">
          <text class="title">我的音乐</text>
          <text class="subtitle">共 {{ currentSongs.length }} 首</text>
        </view>
        <view class="header-right"></view>
      </view>

      <view class="toolbar">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'playlist' }"
          @tap="switchTab('playlist')"
        >
          <text class="tab-text">我的歌单</text>
        </view>
        <view class="add-music-btn" role="button" aria-label="添加音乐" @tap="addLocalMusic">
          <text class="add-icon">＋</text>
          <text class="add-text">添加音乐</text>
        </view>
      </view>

      <scroll-view class="song-list" scroll-y>
        <view
          v-for="(song, index) in currentSongs"
          :key="song.id"
          class="song-item"
          :class="{ playing: player.currentSong?.id === song.id }"
          @tap="playSong(song, index)"
        >
          <text class="index-text">{{ String(index + 1).padStart(2, '0') }}</text>

          <view class="song-cover">
            <image
              :src="song.cover || '/static/logo.jpg'"
              class="cover-image"
              mode="aspectFill"
            />
            <view class="visualizer" v-if="player.currentSong?.id === song.id && player.isPlaying">
              <view class="bar bar-1"></view>
              <view class="bar bar-2"></view>
              <view class="bar bar-3"></view>
            </view>
          </view>

          <view class="song-details">
            <text class="song-title">{{ song.title }}</text>
            <text class="song-artist">{{ song.artist }}</text>
          </view>

          <text class="row-hint" v-if="player.currentSong?.id === song.id && player.isPlaying">正在播放</text>
        </view>

        <view class="loading-more" v-if="loading">
          <text class="loading-text">加载中…</text>
        </view>

        <view class="empty-state" v-if="currentSongs.length === 0 && !loading">
          <text class="empty-icon">♪</text>
          <text class="empty-text">歌单空空的</text>
          <text class="empty-hint">点右上角「添加音乐」导入一首吧</text>
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

const playSong = (song, index) => {
  player.setPlaylist(currentSongs.value, index);
  
  uni.showToast({
    title: `播放: ${song.title}`,
    icon: 'none',
    duration: 1500
  });
  
  console.log('播放歌曲:', song);
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

/* 歌单随手机宽度收缩，长歌名不挤出操作按钮。 */
.my-music-container {
  width: 100%; max-width: 430px; margin: 0 auto; box-sizing: border-box;
  min-height: calc(100vh - 44px); min-height: calc(100dvh - 44px);
}
.my-music-content {
  width: 100%; max-width: 430px; margin: 0; box-sizing: border-box;
  height: calc(100vh - 44px); height: calc(100dvh - 44px);
  display: flex; flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.header, .tabs { flex-shrink: 0; }
.song-list { flex: 1; min-height: 0; height: 0; width: 100%; }
.song-item { padding: 12px 10px; }
.song-index { width: 26px; flex-shrink: 0; }
.song-info, .song-details { min-width: 0; }
.song-cover { flex-shrink: 0; width: 44px; height: 44px; }
.song-info { gap: 8px; }
.song-actions { gap: 0; flex-shrink: 0; }
.action-btn, .back-btn { min-width: 44px; min-height: 44px; }
.tabs { flex-wrap: wrap; gap: 8px; }

/* ===== 歌单页新视觉：与首页播放器统一（深青 + 薄荷） ===== */
.my-music-container {
  width: 100%; max-width: 430px; margin: 0 auto;
  min-height: 100vh; min-height: 100dvh; box-sizing: border-box;
  background:
    radial-gradient(ellipse at 10% 0%, #3d74634d 0%, transparent 52%),
    radial-gradient(ellipse at 100% 58%, #53737926 0%, transparent 55%),
    linear-gradient(165deg, #23483e 0%, #152f2e 52%, #101f25 100%);
  color: #f1f7f3; position: relative; overflow: hidden;
}
.bg-glow { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
.glow-a { width: 240px; height: 240px; left: -80px; top: -70px; background: #4d8b7340; }
.glow-b { width: 220px; height: 220px; right: -90px; bottom: -60px; background: #4a7d8c26; }

.my-music-content {
  position: relative; z-index: 1;
  width: 100%; max-width: 430px; margin: 0; box-sizing: border-box;
  height: 100vh; height: 100dvh;
  display: flex; flex-direction: column;
  padding: calc(16px + env(safe-area-inset-top, 0px)) 18px calc(14px + env(safe-area-inset-bottom, 0px));
  background: transparent;
}

.header {
  display: flex; align-items: center; gap: 12px;
  padding: 2px 0 18px; background: none; color: inherit;
}
.back-btn {
  width: 40px; height: 40px; min-width: 40px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid #e0fff017; border-radius: 14px;
  background: #f0fff509; color: #d8e9e1;
  cursor: pointer; transition: background .2s ease;
}
.back-btn:active { background: #b9e5cf18; }
.header-title { flex: 1; min-width: 0; text-align: left; display: flex; flex-direction: column; gap: 2px; }
.title { font-size: 22px; font-weight: 600; letter-spacing: .4px; color: #f1f7f3; }
.subtitle { font-size: 11px; color: #9cb5ab; letter-spacing: .5px; }
.header-right { width: 40px; flex-shrink: 0; }

.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 12px; }
.tab-item {
  flex: 0 0 auto; padding: 8px 14px; position: static;
  border: 1px solid #e0fff017; border-radius: 14px; background: #f0fff509;
}
.tab-item.active { background: #b9e5cf18; border-color: #b9e5cf55; }
.tab-item.active::after { content: none; }
.tab-text { font-size: 12px; font-weight: 500; color: #a2b9b0; }
.tab-item.active .tab-text { color: #c4efd9; font-weight: 600; }

.add-music-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border: 1px dashed #bee7d366; border-radius: 14px;
  background: transparent; box-shadow: none; animation: none;
  color: #bee7d3; cursor: pointer;
}
.add-music-btn:active { background: #b9e5cf14; transform: none; box-shadow: none; }
.add-icon { color: #bee7d3; font-size: 14px; font-weight: 400; line-height: 1; }
.add-text { color: #bee7d3; font-size: 12px; font-weight: 500; letter-spacing: .3px; }

.song-list {
  flex: 1; min-height: 0; height: 0; width: 100%;
  background: transparent;
}

.song-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; margin-bottom: 8px;
  background: #f0fff507; border: 1px solid #ffffff10; border-radius: 18px;
  transition: background .2s ease, border-color .2s ease;
}
.song-item:active { background: #b9e5cf18; }
.song-item.playing { background: #b9e5cf12; border-color: #b9e5cf44; }

.index-text {
  width: 22px; flex-shrink: 0; text-align: center;
  font-size: 11px; font-weight: 500; color: #748f85;
  font-variant-numeric: tabular-nums;
}

.song-cover {
  position: relative; width: 48px; height: 48px; flex-shrink: 0;
  border-radius: 13px; overflow: hidden;
  background: #28433e; border: 1px solid #ffffff14;
}
.cover-image { width: 100%; height: 100%; display: block; }
.visualizer {
  position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center;
  gap: 3px; padding-bottom: 10px; background: #0b1c1c99;
}
.bar { width: 3px; border-radius: 2px; background: #d8f6e6; animation: bar-bounce 1s ease-in-out infinite; }
.bar-1 { height: 10px; animation-delay: -.3s; }
.bar-2 { height: 16px; animation-delay: -.15s; }
.bar-3 { height: 8px; }
@keyframes bar-bounce {
  0%, 100% { transform: scaleY(.5); }
  50% { transform: scaleY(1.15); }
}

.song-details { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.song-title {
  font-size: 14px; font-weight: 500; color: #f1f7f3;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.song-artist {
  font-size: 11px; color: #9cb5ab;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.row-hint { flex-shrink: 0; font-size: 10px; color: #b6efca; letter-spacing: .4px; }

.loading-more { padding: 16px 0; text-align: center; }
.loading-text { font-size: 12px; color: #9cb5ab; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 70px 20px; }
.empty-icon { font-size: 32px; color: #8fb7a5; }
.empty-text { font-size: 15px; color: #cfe2d8; }
.empty-hint { font-size: 12px; color: #8fa79d; }

@media (max-height: 640px) {
  .header { padding-bottom: 10px; }
  .toolbar { padding-bottom: 8px; }
  .song-item { padding: 8px 10px; margin-bottom: 6px; }
}

</style>
