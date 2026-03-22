/**
 * 音乐状态管理
 * 功能：管理用户喜欢的歌曲列表
 */
import { defineStore } from 'pinia';

export const useMusicStore = defineStore('music', {
  /**
   * 音乐状态
   * 功能：存储音乐相关的状态数据
   */
  state: () => ({
    /**
     * 喜欢的歌曲列表
     * 作用：存储用户标记为喜欢的歌曲
     */
    likedSongs: []
  }),

  /**
   * 音乐操作方法
   * 功能：提供管理音乐列表的方法
   */
  actions: {
    /**
     * 设置喜欢的歌曲列表
     * @param {Array} list - 歌曲列表
     * 功能：更新整个喜欢歌曲列表
     */
    setLikedSongs(list) {
      this.likedSongs = list;
    },

    /**
     * 添加歌曲到喜欢列表
     * @param {Object} song - 歌曲对象
     * 功能：将歌曲添加到喜欢列表，避免重复添加
     */
    addSong(song) {
      if (!this.likedSongs.find(s => s.id === song.id)) {
        this.likedSongs.unshift(song);
      }
    }
  },

  /**
   * 音乐状态获取方法
   * 功能：提供获取音乐状态的计算属性
   */
  getters: {
    /**
     * 获取喜欢的歌曲列表
     * @param {Object} state - 状态对象
     * @returns {Array} 喜欢的歌曲列表
     * 功能：返回当前喜欢的歌曲列表
     */
    getLikedSongs: (state) => state.likedSongs
  }
});
