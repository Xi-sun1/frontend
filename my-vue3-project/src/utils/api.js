/**
 * API工具类
 * 功能：封装所有API请求，提供统一的请求处理和错误处理
 */

/**
 * API根地址
 * 作用：统一管理API请求的基础URL
 */
const API_BASE_URL = 'http://139.196.96.99:3000/api';

/**
 * 获取token
 * @returns {string} 存储的token
 * 功能：从本地存储中获取用户认证token
 */
const getToken = () => {
  return uni.getStorageSync('token');
};

/**
 * 统一请求方法
 * @param {string} url - 请求路径
 * @param {string} method - 请求方法（默认GET）
 * @param {Object} data - 请求数据（默认{}）
 * @param {Object} header - 请求头（默认{}）
 * @returns {Promise} 请求结果Promise
 * 功能：处理API请求，添加认证信息，统一错误处理
 */
const request = (url, method = 'GET', data = {}, header = {}) => {
  // 添加token到请求头
  const token = getToken();
  if (token) {
    header.Authorization = `Bearer ${token}`;
  }
  
  // 合并默认header
  const defaultHeader = {
    'Content-Type': 'application/json'
  };
  
  return new Promise((resolve, reject) => {
    console.log('API请求:', {
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: { ...defaultHeader, ...header }
    });
    
    uni.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header: { ...defaultHeader, ...header },
      success: (res) => {
        console.log('API响应:', res);
        const { statusCode, data: responseData } = res;
        
        // 修改：即使后端返回500状态码，只要返回了歌曲数据，就视为成功
        if (statusCode === 200 || statusCode === 201 || (statusCode === 500 && responseData && (responseData.list || responseData.data))) {
          console.log('API响应成功（状态码:', statusCode, '），返回数据:', responseData);
          resolve(responseData);
        } else {
          // 处理错误，不显示任何错误信息
          const errorMessage = responseData?.message || '请求失败';
          console.error('API错误:', errorMessage);
          console.error('API错误详情:', {
            statusCode,
            responseData,
            url: `${API_BASE_URL}${url}`,
            method,
            data
          });
          reject(responseData);
        }
      },
      fail: (err) => {
        console.error('网络错误:', err);
        console.error('网络错误详情:', {
          url: `${API_BASE_URL}${url}`,
          method,
          data
        });
        // 不显示任何网络错误信息
        reject(err);
      }
    });
  });
};

/**
 * 用户认证相关API
 * 功能：处理用户登录、注册和获取用户信息
 */
export const authApi = {
  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise} 登录结果
   * 功能：验证用户凭据，获取认证token
   */
  login: (username, password) => {
    return request('/auth/login', 'POST', { username, password });
  },
  
  /**
   * 用户注册
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {string} email - 邮箱（可选）
   * @returns {Promise} 注册结果
   * 功能：创建新用户账号
   */
  register: (username, password, email = '') => {
    return request('/auth/register', 'POST', { username, password, email });
  },
  
  /**
   * 获取当前用户信息
   * @returns {Promise} 用户信息
   * 功能：获取当前登录用户的详细信息
   */
  getCurrentUser: () => {
    return request('/auth/me', 'GET');
  }
};

/**
 * 音乐相关API
 * 功能：获取歌曲列表和歌曲详情
 */
export const songApi = {
  /**
   * 获取歌曲列表
   * @param {number} page - 页码（默认1）
   * @param {number} limit - 每页数量（默认500）
   * @returns {Promise} 歌曲列表
   * 功能：获取分页的歌曲列表数据
   * 说明：默认limit值为500，确保与后端匹配
   */
  getSongList: (page = 1, limit = 500) => {
    console.log('获取歌曲列表请求:', {
      page,
      limit,
      url: `/songs?page=${page}&limit=${limit}`
    });
    return request(`/songs?page=${page}&limit=${limit}`, 'GET');
  },
  
  /**
   * 获取歌曲详情
   * @param {string} songId - 歌曲ID
   * @returns {Promise} 歌曲详情
   * 功能：获取指定歌曲的详细信息
   */
  getSongDetail: (songId) => {
    return request(`/songs/${songId}`, 'GET');
  }
};

/**
 * 喜欢歌曲相关API
 * 功能：管理用户喜欢的歌曲
 */
export const likedSongApi = {
  /**
   * 获取喜欢的歌曲列表
   * @param {number} page - 页码（默认1）
   * @param {number} limit - 每页数量（默认20）
   * @returns {Promise} 喜欢的歌曲列表
   * 功能：获取用户收藏的歌曲列表
   */
  getLikedSongs: (page = 1, limit = 20) => {
    return request(`/user/liked-songs?page=${page}&limit=${limit}`, 'GET');
  },
  
  /**
   * 添加喜欢的歌曲
   * @param {string} songId - 歌曲ID
   * @returns {Promise} 添加结果
   * 功能：将歌曲添加到用户的喜欢列表
   */
  addLikedSong: (songId) => {
    return request(`/user/liked-songs/${songId}`, 'POST');
  },
  
  /**
   * 取消喜欢的歌曲
   * @param {string} songId - 歌曲ID
   * @returns {Promise} 移除结果
   * 功能：从用户的喜欢列表中移除歌曲
   */
  removeLikedSong: (songId) => {
    return request(`/user/liked-songs/${songId}`, 'DELETE');
  },
  
  /**
   * 检查歌曲是否已喜欢
   * @param {string} songId - 歌曲ID
   * @returns {Promise} 检查结果
   * 功能：检查指定歌曲是否在用户的喜欢列表中
   */
  checkIsLiked: (songId) => {
    return request(`/user/liked-songs/check/${songId}`, 'GET');
  }
};

/**
 * 最近听过相关API
 * 功能：管理用户最近播放的歌曲记录
 */
export const recentPlayApi = {
  /**
   * 获取最近听过的歌曲列表
   * @param {number} limit - 记录数量（默认20）
   * @returns {Promise} 最近播放记录列表
   * 功能：获取用户最近播放的歌曲历史
   */
  getRecentPlays: (limit = 20) => {
    return request(`/user/recent-plays?limit=${limit}`, 'GET');
  },
  
  /**
   * 添加到最近听过
   * @param {string} songId - 歌曲ID
   * @returns {Promise} 添加结果
   * 功能：将歌曲添加到用户的最近播放记录
   */
  addRecentPlay: (songId) => {
    return request('/user/recent-plays', 'POST', { songId });
  }
};

/**
 * 歌单相关API
 * 功能：管理用户歌单
 */
export const playlistApi = {
  /**
   * 获取用户歌单列表
   * @returns {Promise} 歌单列表
   * 功能：获取用户创建的所有歌单
   */
  getUserPlaylists: () => {
    return request('/user/playlists', 'GET');
  },
  
  /**
   * 创建歌单
   * @param {string} name - 歌单名称
   * @param {string} description - 歌单描述（可选）
   * @returns {Promise} 创建结果
   * 功能：创建新的用户歌单
   */
  createPlaylist: (name, description = '') => {
    return request('/user/playlists', 'POST', { name, description });
  },
  
  /**
   * 获取歌单详情
   * @param {string} playlistId - 歌单ID
   * @returns {Promise} 歌单详情
   * 功能：获取指定歌单的详细信息和歌曲列表
   */
  getPlaylistDetail: (playlistId) => {
    return request(`/user/playlists/${playlistId}`, 'GET');
  },
  
  /**
   * 添加歌曲到歌单
   * @param {string} playlistId - 歌单ID
   * @param {string} songId - 歌曲ID
   * @returns {Promise} 添加结果
   * 功能：将歌曲添加到指定歌单
   */
  addSongToPlaylist: (playlistId, songId) => {
    return request(`/user/playlists/${playlistId}/songs`, 'POST', { songId });
  }
};

/**
 * 搜索相关API
 * 功能：提供歌曲搜索功能
 */
export const searchApi = {
  /**
   * 搜索歌曲
   * @param {string} keyword - 搜索关键词
   * @param {string} type - 搜索类型（默认'song'）
   * @param {number} page - 页码（默认1）
   * @param {number} limit - 每页数量（默认20）
   * @returns {Promise} 搜索结果
   * @throws {Error} 搜索关键词为空时抛出错误
   * 功能：根据关键词搜索歌曲
   */
  search: (keyword, type = 'song', page = 1, limit = 20) => {
    if (!keyword || typeof keyword !== 'string') {
      return Promise.reject(new Error('搜索关键词不能为空'));
    }
    const encodedKeyword = encodeURIComponent(keyword.trim());
    return request(`/search?keyword=${encodedKeyword}&type=${type}&page=${page}&limit=${limit}`, 'GET');
  }
};

/**
 * 情绪音乐推荐相关API
 * 功能：根据用户情绪推荐音乐
 */
export const emotionApi = {
  /**
   * 根据情绪推荐音乐
   * @param {string} emotion - 情绪类型
   * @param {number} confidence - 情绪置信度
   * @returns {Promise} 推荐音乐列表
   * 功能：根据用户当前情绪推荐适合的音乐
   */
  recommendByEmotion: (emotion, confidence) => {
    return request('/music/recommend', 'POST', {
      emotion,
      confidence,
      userId: uni.getStorageSync('userInfo')?.id
    });
  },
  
  /**
   * 获取音乐详情
   * @param {string} musicId - 音乐ID
   * @returns {Promise} 音乐详情
   * 功能：获取指定音乐的详细信息
   */
  getMusicDetail: (musicId) => {
    return request(`/music/${musicId}`, 'GET');
  }
};
