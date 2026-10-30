/**
 * 播放器状态管理
 * 功能：管理音乐播放状态、播放列表、播放控制等
 */
import { defineStore } from 'pinia';

export const usePlayerStore = defineStore('player', {
  /**
   * 播放器状态
   * 功能：存储播放器相关的所有状态数据
   */
  state: () => ({
    /**
     * 音频上下文实例
     * 作用：用于控制音频播放
     */
    audio: null,
    
    /**
     * 播放列表
     * 作用：存储当前的歌曲列表
     */
    playList: [],
    
    /**
     * 当前播放索引
     * 作用：标识当前播放的歌曲在列表中的位置
     */
    currentIndex: 0,
    
    /**
     * 当前播放歌曲
     * 作用：存储当前播放歌曲的详细信息
     */
    currentSong: null,
    
    /**
     * 播放状态
     * 作用：标识当前是否正在播放
     */
    isPlaying: false,
    
    /**
     * 当前播放时间
     * 作用：跟踪音频当前播放的时间点
     */
    currentTime: 0,
    
    /**
     * 音频总时长
     * 作用：存储音频文件的总时长
     */
    duration: 0,
    
    /**
     * 播放进度百分比
     * 作用：计算并存储播放进度的百分比
     */
    progress: 0
  }),

  actions: {
    initAudio() {
      if (!this.audio) {
        this.audio = uni.createInnerAudioContext();
        this.audio.autoplay = false;

        // 错误与状态监听，便于 H5 环境定位播放失败原因
        this.audio.onError((err) => {
          console.error('Audio 错误:', err);
          this.isPlaying = false;
          uni.showToast({ title: '音频加载失败，请重试或切换歌曲', icon: 'none' });
        });

        this.audio.onWaiting(() => {
          console.warn('Audio waiting for data, src=', this.audio && this.audio.src);
        });

        this.audio.onEnded(() => {
          this.isPlaying = false;
          console.log('Audio ended');
        });

        this.audio.onPlay(() => {
          this.isPlaying = true;
        });

        this.audio.onPause(() => {
          this.isPlaying = false;
        });

        // ==================== 修改2：添加音频事件监听器 ====================
        // 问题：进度条不动，总时长不显示
        // 解决方案：添加两个事件监听器来实时更新进度条状态
        
        // 1. 监听音频播放时间更新，实时更新进度条
        this.audio.onTimeUpdate(() => {
          this.currentTime = this.audio.currentTime;
          this.duration = this.audio.duration;
          // 计算播放进度百分比
          if (this.duration > 0) {
            this.progress = (this.currentTime / this.duration) * 100;
          }
        });

        // 2. 监听音频元数据加载完成，获取音频总时长
        this.audio.onCanplay(() => {
          this.duration = this.audio.duration;
        });
        // ====================================================================
      }
    },

    setPlaylist(list, index = 0) {
      if (!Array.isArray(list) || list.length === 0) {
        console.warn('播放列表为空');
        return;
      }
      
      const validIndex = Math.max(0, Math.min(index, list.length - 1));
      this.playList = list;
      this.currentIndex = validIndex;
      this.currentSong = list[validIndex];
      
      // ==================== 修改3：重置进度条相关状态 ====================
      // 问题：播放新歌曲时应该从头开始，而不是从之前的位置继续
      // 解决方案：在设置新的播放列表时重置进度条相关状态
      this.currentTime = 0;
      this.duration = 0;
      this.progress = 0;
      // ====================================================================
      
      // 确保音频已初始化
      if (!this.audio) {
        this.initAudio();
      }
      
      this.play();
    },

    playSong(song) {
      if (!song) {
        console.warn('歌曲为空，无法播放');
        return;
      }
      
      this.currentSong = song;
      
      // ==================== 修改4：重置进度条相关状态 ====================
      // 问题：播放新歌曲时应该从头开始，而不是从之前的位置继续
      // 解决方案：在播放单首歌曲时重置进度条相关状态
      this.currentTime = 0;
      this.duration = 0;
      this.progress = 0;
      // ====================================================================
      
      this.play();
    },

    play() {
      if (!this.currentSong) return;
      if (!this.audio) this.initAudio();

      // 尝试从常见字段获取音源
      const src = this.currentSong.url || this.currentSong.src || this.currentSong.path || this.currentSong.audioUrl || this.currentSong.songUrl;

      if (!src || typeof src !== 'string') {
        console.warn('无效的音频源，无法播放：', this.currentSong);
        return;
      }

      console.log('尝试播放音源:', src, 'currentSong:', this.currentSong);
      if (this.audio.src !== src) this.audio.src = src;

      try {
        // ==================== 修改5：恢复之前的播放位置 ====================
        // 问题：暂停后重新播放从头开始，而不是接着刚刚播放的那一段继续播放
        // 解决方案：在播放前恢复之前的播放位置
        if (this.currentTime > 0) {
          this.audio.seek(this.currentTime);
        }
        // ====================================================================

        // H5 下 play 返回 Promise，捕获异常以避免未捕获的 promise
        const playRes = this.audio.play();
        if (playRes && playRes.catch) {
          playRes.catch((e) => {
            console.error('audio.play() Promise 拒绝:', e);
            this.isPlaying = false;
          });
        }
      } catch (err) {
        console.error('调用 audio.play() 失败:', err);
        this.isPlaying = false;
      }
    },

    pause() {
      if (!this.audio) return;
      
      this.audio.pause();
      this.isPlaying = false;
    },

    toggle() {
      this.isPlaying ? this.pause() : this.play();
    },

    stop() {
      if (!this.audio) return;
      
      this.audio.stop();
      this.isPlaying = false;
    },

    next() {
      if (this.playList.length === 0) {
        console.warn('播放列表为空，无法播放下一首');
        return;
      }
      const nextIndex = (this.currentIndex + 1) % this.playList.length;
      this.setPlaylist(this.playList, nextIndex);
    },

    prev() {
      if (this.playList.length === 0) {
        console.warn('播放列表为空，无法播放上一首');
        return;
      }
      const prevIndex = (this.currentIndex - 1 + this.playList.length) % this.playList.length;
      this.setPlaylist(this.playList, prevIndex);
    },

    setCurrentTime(time) {
      if (!this.audio || !this.currentSong || !Number.isFinite(time) ||
          !Number.isFinite(this.duration) || this.duration <= 0) return;
      const target = Math.max(0, Math.min(time, this.duration));
      this.audio.seek(target);
      this.currentTime = target;
      this.progress = target / this.duration * 100;
    }

  },

  getters: {
    getCurrentSong: (state) => state.currentSong,
    getPlayList: (state) => state.playList,
    getIsPlaying: (state) => state.isPlaying,
    getCurrentIndex: (state) => state.currentIndex,
    // ==================== 修改6：添加进度条相关状态的getter方法 ====================
    // 问题：组件需要访问进度条相关的状态变量
    // 解决方案：添加三个getter方法，用于获取进度条相关的状态变量
    getCurrentTime: (state) => state.currentTime,
    getDuration: (state) => state.duration,
    getProgress: (state) => state.progress
    // ====================================================================
  }
});
