<!-- 
首页/音乐播放器页面
功能：音乐播放控制、手势识别、情绪识别、音乐推荐
-->
<template>
  <view class="page">

    <view class="player-header">
      <button class="gesture-btn" :class="{ active: cameraVisible }"
        :aria-label="cameraVisible ? '关闭手势与情绪识别' : '开启手势与情绪识别'"
        :aria-pressed="cameraVisible" @click="handleCameraToggle">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 5L9.5 3H14.5L16 5H20V20H4V5H8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/>
        </svg>
        <text>{{ cameraVisible ? '识别中' : '情绪识别' }}</text>
        <view class="recognition-dot" :class="{ active: cameraVisible }"></view>
      </button>
      <button class="library-btn" aria-label="打开我的音乐" @click="goToMyMusic">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 5H20M4 10H15M4 15H12M18 10V19" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <circle cx="15.5" cy="19" r="2.5" stroke="currentColor" stroke-width="1.7"/>
        </svg>
        <text>歌单</text>
      </button>
    </view>

    <view v-if="cameraVisible" class="camera-container">
      <view v-if="isH5" id="h5-video-host" class="camera-video-wrap"></view>

      <camera v-if="!isH5" device-position="front" flash="off" class="camera-video"></camera>

      <!-- 分区状态条：系统状态 / 错误 单独一行，手势与情绪状态分开显示，互不覆盖 -->
      <view class="camera-status-bar">
        <view v-if="cameraError" class="status-line error-line">
          <text>{{ cameraError }}</text>
        </view>
        <view v-else-if="cameraStatus" class="status-line system-line">
          <text>{{ cameraStatus }}</text>
        </view>
        <view class="status-row">
          <view class="status-chip">
            <text class="chip-tag">手势</text>
            <text class="chip-text">{{ gestureStatus || '—' }}</text>
          </view>
          <view class="status-chip">
            <text class="chip-tag">情绪</text>
            <text class="chip-text">{{ emotionStatus || '—' }}</text>
          </view>
        </view>
      </view>

      <view class="close-camera" @click="closeCamera">✕</view>
    </view>

    <view class="album-section">
      <view class="album-cover">
        <image class="cover-image" :src="player.currentSong?.cover || '/static/logo.jpg'" mode="aspectFill"></image>
      </view>
      
      <view class="song-info">
        <text class="song-title">{{ player.currentSong?.title || '未播放' }}</text>
        <text class="song-artist">{{ player.currentSong?.artist || '-' }}</text>
      </view>
      
      <view v-if="showProgress" class="progress-section">
        <slider class="seek-control" :value="isDragging ? seekPreview : player.progress"
          :disabled="!player.duration" :min="0" :max="100" :step="0.1"
          activeColor="#bee7d3" backgroundColor="#526c64" block-color="#e2f6eb"
          :block-size="16" @changing="onSeekPreview" @change="onSeekCommit" />
        <view class="time-info">
          <text class="current-time">{{ formatTime(player.currentTime) }}</text>
          <text class="total-time">{{ formatTime(player.duration) }}</text>
        </view>
      </view>
    </view>

    <view class="control-bar">
      <!-- 上一首按钮  -->
      <button class="control-btn" aria-label="上一首" @click="prevSong">
        <view class="btn-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 6V26" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
            <path d="M26 26L8 16L26 6Z" fill="#fff"/>
          </svg>
        </view>
      </button>
      <!-- 播放/暂停按钮  -->
      <button class="control-btn play-btn" :aria-label="player.isPlaying ? '暂停' : '播放'" @click="togglePlay">
        <view class="btn-icon" v-if="player.isPlaying">
          <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
            
            <rect x="16" y="14" width="6" height="22" rx="2" fill="#173d36"/>
            <rect x="28" y="14" width="6" height="22" rx="2" fill="#173d36"/>
          </svg>
        </view>

        <view class="btn-icon" v-else>
          <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
            
            <path d="M19 13L36 25L19 37V13Z" fill="#173d36"/>
          </svg>
        </view>
      </button>
      <!-- 下一首按钮  -->
      <button class="control-btn" aria-label="下一首" @click="nextSong">
        <view class="btn-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M6 26L26 16L6 6Z" fill="#fff"/>
            <path d="M24 6V26" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </view>
      </button>

    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { authApi, songApi } from '@/utils/api';
import { usePlayerStore } from '@/store/player';
import { useMusicStore } from '@/store/music';

const systemInfo = uni.getSystemInfoSync();
const isH5 =
  (typeof process !== 'undefined' && process.env && process.env.UNI_PLATFORM === 'h5') ||
  systemInfo.uniPlatform === 'h5' ||
  systemInfo.platform === 'web';
const player = usePlayerStore();
const musicStore = useMusicStore();

const cameraVisible = ref(false);
const showProgress = ref(true);
const cameraStatus = ref('');
const cameraError = ref('');
const gestureStatus = ref('');
const emotionStatus = ref('');
const emotionResults = ref([]);
const currentEmotion = ref(null);
const emotionStartTime = ref(null);
// 情绪推荐触发灵敏度（可按需调整）
const emotionConfidenceThreshold = 0.6;   // 置信度阈值，低于此值不跟踪
const emotionHoldDurationMs = 2000;       // 表情需持续保持的时长（毫秒）
const isRecommending = ref(false);
const pendingEmotion = ref(null);
const pendingEmotionType = ref(null);
const pendingEmotionConfidence = ref(null);

const currentTime = computed(() => player.currentTime);
const duration = computed(() => player.duration);
const progress = computed(() => player.progress);

// face-api.js 输出的 7 类表情
const emotionLabels = {
  'happy': '😊 开心',
  'sad': '😢 悲伤',
  'angry': '😠 生气',
  'fearful': '😨 紧张',
  'disgusted': '😖 厌恶',
  'surprised': '😲 惊讶',
  'neutral': '😐 平静'
};

// 表情 → 推荐类型映射（后端支持 happy/excited/sad/calm）
// happy/surprised → 欢快；sad → 舒缓忧郁；其余负性/平静表情 → 放松平复
const emotionTypeMap = {
  'happy': 'happy',
  'surprised': 'happy',
  'sad': 'sad',
  'neutral': 'calm',
  'angry': 'calm',
  'fearful': 'calm',
  'disgusted': 'calm'
};

const isDragging = ref(false);
const seekPreview = ref(0);
const onSeekPreview = (event) => {
  isDragging.value = true;
  seekPreview.value = Number(event.detail.value);
};
const onSeekCommit = (event) => {
  const percent = Number(event.detail.value);
  if (Number.isFinite(percent)) player.setCurrentTime(percent / 100 * player.duration);
  isDragging.value = false;
};

// 摄像头和画布相关变量
let stream = null;
let video = null;
let gestureCanvas = null;
let emotionCanvas = null;
let gestureCtx = null;
let emotionCtx = null;

// 手势识别相关变量
let hands = null;
let mpCamera = null;
let processing = false;
let noHandFrames = 0;
let gestureLock = false;
let lastGestureTime = 0;
let lastProcessTime = 0;
// 是否由「握拳」手势主动暂停了播放
let isPausedByFist = false;

// 情绪识别相关变量
let isEmotionDetectionRunning = false;
let faceApiModelsLoaded = false;
let emotionDetectionInterval = null;

// 加载脚本函数
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// 加载MediaPipe
const loadMediaPipe = async () => {
  if (window.Hands) return;

  gestureStatus.value = '手势模型加载中…';

  try {
    await Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
    ]);

    console.log('MediaPipe 加载完成');
    gestureStatus.value = '手势模型就绪';
  } catch (error) {
    console.error('MediaPipe 加载失败:', error);
    cameraError.value = '手势识别模型加载失败';
  }
};

// 加载face-api.js模型
const loadFaceApiModels = async () => {
  try {
    emotionStatus.value = '情绪模型加载中…';

    if (faceApiModelsLoaded) {
      console.log('✅ face-api.js模型已加载');
      return true;
    }

    if (!window.faceapi) {
      console.log('加载face-api.js库...');
      await loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js');
    }

    const modelPath = 'https://justadudewhohacks.github.io/face-api.js/models';

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
    ]);

    console.log('✅ 情绪识别模型加载完成');
    faceApiModelsLoaded = true;
    emotionStatus.value = '情绪模型就绪';
    return true;

  } catch (error) {
    console.error('❌ face-api.js模型加载失败:', error);
    cameraError.value = '情绪识别模型加载失败';
    return false;
  }
};

// 统一开关按钮：同时开启/关闭 手势 + 情绪识别
const handleCameraToggle = async () => {
  if (cameraVisible.value) {
    closeCamera();
  } else {
    await openCamera();
  }
};

// 打开摄像头
const openCamera = async () => {
  try {
    cameraError.value = '';
    cameraStatus.value = '正在启动摄像头...';
    cameraVisible.value = true;
    showProgress.value = false;

    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 300));

    if (isH5) {
      console.log('1. 创建原生视频与画布元素...');
      
      const host = document.getElementById('h5-video-host');
      if (!host) {
        throw new Error('视频容器未找到，请刷新页面重试');
      }
      host.innerHTML = '';

      video = document.createElement('video');
      video.id = 'h5-raw-video';
      video.autoplay = false;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('webkit-playsinline', 'true');
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.display = 'block';
      video.style.transform = 'scaleX(-1)';

      gestureCanvas = document.createElement('canvas');
      gestureCanvas.id = 'gesture-canvas';
      Object.assign(gestureCanvas.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '10',
        pointerEvents: 'none',
        transform: 'scaleX(-1)',
      });

      emotionCanvas = document.createElement('canvas');
      emotionCanvas.id = 'emotion-canvas';
      Object.assign(emotionCanvas.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        zIndex: '15',
        pointerEvents: 'none',
        transform: 'scaleX(-1)',
      });

      host.appendChild(video);
      host.appendChild(gestureCanvas);
      host.appendChild(emotionCanvas);
      
      console.log('2. 请求摄像头权限...');
      cameraStatus.value = '正在请求摄像头权限...';
      
      // 简化摄像头请求，确保获取到有效流
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            // 使用更兼容的设置
            width: 320,
           height: 240,
            frameRate: { max: 15 }
          },
          audio: false
        });
        
        console.log('✅ 摄像头权限获取成功');
        console.log('视频轨道数量:', stream.getVideoTracks().length);
        
        if (stream.getVideoTracks().length === 0) {
          throw new Error('摄像头流中没有视频轨道');
        }
        
      } catch (permissionErr) {
        console.error('摄像头权限错误:', permissionErr);
        
        // 尝试更简单的设置
        cameraStatus.value = '尝试备用设置...';
        stream = await navigator.mediaDevices.getUserMedia({
          video: true, // 让浏览器自动选择
          audio: false
        });
      }
      
      console.log('3. 设置视频源...');
      
      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('获取的视频流无效');
      }
      
      video.srcObject = null;
      
      video.srcObject = stream;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('4. 等待视频就绪...');
      cameraStatus.value = '正在初始化视频...';
      await new Promise((resolve) => {
        const checkReady = () => {
          if (video.readyState >= 2 || (video.videoWidth > 0 && video.videoHeight > 0)) {
            console.log('视频已就绪，状态:', video.readyState);
            console.log('视频尺寸:', video.videoWidth, 'x', video.videoHeight);
            resolve();
            return;
          }
          
          setTimeout(checkReady, 100);
        };
        
        // 超时保护
        setTimeout(() => {
          console.warn('视频就绪检查超时，继续执行');
          // 即使超时，也设置默认视频尺寸
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.log('设置默认视频尺寸');
            // 手动触发视频尺寸更新
            if (video.srcObject) {
              const tracks = video.srcObject.getVideoTracks();
              if (tracks.length > 0) {
                const settings = tracks[0].getSettings();
                console.log('摄像头设置:', settings);
              }
            }
          }
          resolve();
        }, 5000); // 增加超时时间到5秒
        
        checkReady();
      });
      
      console.log('5. 开始播放视频...');
      
      // 如果此时仍然没有有效的视频流，直接抛错，避免浏览器报 “no supported sources”
      if (!video.srcObject || !video.srcObject.getVideoTracks || video.srcObject.getVideoTracks().length === 0) {
        throw new Error('视频流尚未就绪，请检查摄像头或浏览器权限设置');
      }

      // 进一步防御：确认 video 确实是 HTMLVideoElement 且包含 play 方法
      if (!(video instanceof HTMLVideoElement) || typeof video.play !== 'function') {
        console.error('video 对象不是原生 HTMLVideoElement 或不支持 play():', video);
        cameraError.value = '当前运行环境不支持原生视频播放，请在 H5 浏览器中运行项目（npm run dev:h5 后用浏览器访问）';
        return;
      }
      
      // 尝试播放视频（H5 下 play 返回 Promise）
      try {
        const playPromise = video.play();
        
        if (playPromise && playPromise.then) {
          await playPromise;
          console.log('✅ 视频播放成功');
        } else {
          console.log('✅ 视频播放已触发（无 Promise）');
        }
      } catch (playErr) {
        console.warn('视频自动播放被阻止或失败:', playErr);
        // 设置静音以允许自动播放
        video.muted = true;
        try {
          const mutedPlay = video.play();
          if (mutedPlay && mutedPlay.then) {
            await mutedPlay;
          }
          console.log('✅ 静音模式下视频播放成功');
        } catch (mutedErr) {
          console.warn('静音播放也失败:', mutedErr);
          cameraStatus.value = '视频播放被浏览器拦截，请点击画面开始播放';
        }
      }
      
      // 获取Canvas元素
      console.log('6. 设置Canvas...');
      gestureCanvas = document.getElementById('gesture-canvas');
      emotionCanvas = document.getElementById('emotion-canvas');
      
      // 设置Canvas尺寸与视频一致
      const defaultWidth = 640;
      const defaultHeight = 480;
      
      if (gestureCanvas) {
        gestureCanvas.width = video.videoWidth > 0 ? video.videoWidth : defaultWidth;
        gestureCanvas.height = video.videoHeight > 0 ? video.videoHeight : defaultHeight;
        console.log('Gesture Canvas尺寸:', gestureCanvas.width, 'x', gestureCanvas.height);
      }
      
      if (emotionCanvas) {
        emotionCanvas.width = video.videoWidth > 0 ? video.videoWidth : defaultWidth;
        emotionCanvas.height = video.videoHeight > 0 ? video.videoHeight : defaultHeight;
        console.log('Emotion Canvas尺寸:', emotionCanvas.width, 'x', emotionCanvas.height);
      }
      
      // 监听视频尺寸变化，动态调整Canvas尺寸
      video.addEventListener('resize', () => {
        console.log('视频尺寸变化:', video.videoWidth, 'x', video.videoHeight);
        if (gestureCanvas) {
          gestureCanvas.width = video.videoWidth > 0 ? video.videoWidth : defaultWidth;
          gestureCanvas.height = video.videoHeight > 0 ? video.videoHeight : defaultHeight;
        }
        if (emotionCanvas) {
          emotionCanvas.width = video.videoWidth > 0 ? video.videoWidth : defaultWidth;
          emotionCanvas.height = video.videoHeight > 0 ? video.videoHeight : defaultHeight;
        }
      });
      
      // 同时加载手势识别 + 情绪识别
      console.log('7. 加载AI模型（手势 + 情绪）...');
      // 手势识别
      await loadMediaPipe();
      initMediaPipe();
      startGestureProcessing();
      gestureStatus.value = '等待手势…';

      // 情绪识别
      const modelsLoaded = await loadFaceApiModels();
      if (modelsLoaded) {
        await startEmotionDetection();
        emotionStatus.value = '等待检测人脸…';
      }

      // 启动完成，清空系统提示，后续状态由手势/情绪分栏展示
      cameraStatus.value = '';

      console.log('✅ 摄像头开启流程完成');
    }
  } catch (err) {
    console.error('❌ 摄像头开启失败:', err);
    console.error('错误名称:', err.name);
    console.error('错误信息:', err.message);
    console.error('错误栈:', err.stack);
    
    if (err.name === 'NotSupportedError') {
      cameraError.value = '浏览器不支持视频播放，请使用Chrome或Edge浏览器';
    } else if (err.name === 'NotAllowedError') {
      cameraError.value = '摄像头权限被拒绝，请检查浏览器设置';
    } else if (err.name === 'NotFoundError') {
      cameraError.value = '未找到摄像头设备';
    } else if (err.message.includes('video element')) {
      cameraError.value = '视频元素初始化失败，请刷新页面';
    } else {
      cameraError.value = `摄像头开启失败: ${err.message}`;
    }
    
    closeCamera();
  }
};

// 初始化MediaPipe手势识别
const initMediaPipe = () => {
  try {
    if (!window.Hands) {
      console.error('Hands库未加载');
      return;
    }
    
    hands = new window.Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });
    
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
      staticImageMode: false
    });
    
    hands.onResults((results) => {
      if (!gestureCanvas || !video || !cameraVisible.value) return;
      
      gestureCtx = gestureCanvas.getContext('2d');
      
      // 清空画布
      gestureCtx.save();
      gestureCtx.clearRect(0, 0, gestureCanvas.width, gestureCanvas.height);
      
      // 绘制视频帧
      gestureCtx.drawImage(results.image, 0, 0, gestureCanvas.width, gestureCanvas.height);
      
      // 检测到手部
      if (results.multiHandLandmarks?.length) {
        const lm = results.multiHandLandmarks[0];
        
        // 绘制手部关键点和连接线
        if (window.drawConnectors && window.drawLandmarks) {
          window.drawConnectors(gestureCtx, lm, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
          window.drawLandmarks(gestureCtx, lm, { color: '#FF0000', lineWidth: 1, radius: 3 });
        }
        
        // 每帧都调用onHandResults进行手势识别（显示状态），但动作触发仍然有锁保护
        onHandResults(results);
        
        noHandFrames = 0;
      } else {
        noHandFrames++;

        // 只有当之前显示的是手势状态时，才更新为未检测到状态，避免闪烁
        if (gestureStatus.value !== '未检测到手，请举到画面中央') {
          gestureStatus.value = '未检测到手，请举到画面中央';
        }

        if (noHandFrames > 10) {
          if (hands.reset) hands.reset();
          noHandFrames = 0;
        }
      }
      
      gestureCtx.restore();
    });
    
    console.log('MediaPipe初始化完成');
  } catch (error) {
    console.error('MediaPipe初始化失败:', error);
    cameraError.value = '手势识别初始化失败';
  }
};

// 开始手势处理
const startGestureProcessing = () => {
  if (!hands || !video) return;
  
  const processFrame = async () => {
    if (!cameraVisible.value) return;
    
    const now = Date.now();
    if (processing || now - lastProcessTime < 100) {
      requestAnimationFrame(processFrame);
      return;
    }
    
    processing = true;
    lastProcessTime = now;
    
    try {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        await hands.send({ image: video });
      }
    } catch (error) {
      console.error('手势处理失败:', error);
    } finally {
      processing = false;
      if (cameraVisible.value) {
        requestAnimationFrame(processFrame);
      }
    }
  };
  
  processFrame();
};

// 停止手势检测
const stopGestureDetection = () => {
  if (mpCamera) {
    mpCamera.stop();
    mpCamera = null;
  }
  processing = false;
  gestureLock = false;
  isPausedByFist = false;

  if (gestureCanvas && gestureCtx) {
    gestureCtx.clearRect(0, 0, gestureCanvas.width, gestureCanvas.height);
  }
  gestureStatus.value = '';
};

// 开始情绪识别
const startEmotionDetection = async () => {
  if (!video || !cameraVisible.value) return;
  if (!window.faceapi) {
    console.error('face-api.js 未加载，无法进行情绪识别');
    cameraError.value = '情绪识别库未正确加载';
    return;
  }

  if (!emotionCanvas || !(emotionCanvas instanceof HTMLCanvasElement)) {
    const canvasEl = document.getElementById('emotion-canvas');
    if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
      console.error('emotion-canvas 不是有效的 canvas 元素:', canvasEl);
      cameraError.value = '情绪画布初始化失败，请刷新页面重试';
      return;
    }
    emotionCanvas = canvasEl;
  }

  if (typeof emotionCanvas.getContext !== 'function') {
    console.error('emotionCanvas.getContext 不可用:', emotionCanvas);
    cameraError.value = '浏览器不支持 Canvas，无法进行情绪可视化';
    return;
  }

  emotionCtx = emotionCanvas.getContext('2d');
  
  emotionResults.value = [];
  
  emotionCanvas.width = video.videoWidth;
  emotionCanvas.height = video.videoHeight;
  
  isEmotionDetectionRunning = true;
  
  const detectEmotions = async () => {
    if (!isEmotionDetectionRunning || !cameraVisible.value) return;
    
    try {
      emotionCtx.clearRect(0, 0, emotionCanvas.width, emotionCanvas.height);
      
      const detections = await faceapi.detectAllFaces(
        video, 
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceExpressions();
      
      const results = [];

      if (detections.length > 0) {
        detections.forEach((detection, index) => {
          const { detection: face, expressions } = detection;

          const sortedExpressions = Object.entries(expressions)
            .sort((a, b) => b[1] - a[1]);

          const primaryEmotion = sortedExpressions[0][0];
          const confidence = sortedExpressions[0][1];

          const emotionKey = Object.keys(emotionLabels).includes(primaryEmotion) ? primaryEmotion : 'neutral';
          results.push({
            id: index,
            key: emotionKey,
            emotion: emotionLabels[emotionKey],
            type: emotionTypeMap[emotionKey] || 'calm',
            confidence: confidence,
            expressions: expressions
          });

          drawFaceBox(face.box, emotionKey, confidence);

          drawEmotionLabel(face.box, emotionKey, confidence);

          if (detection.landmarks) {
            drawFaceLandmarks(detection.landmarks);
          }
        });

        emotionResults.value = results;

        if (results.length > 0) {
          const primary = results[0];
          const pct = `${(primary.confidence * 100).toFixed(0)}%`;

          // 情绪状态：显示表情、置信度，跟踪中时显示保持进度
          if (currentEmotion.value === primary.key && emotionStartTime.value) {
            const holdSec = ((Date.now() - emotionStartTime.value) / 1000).toFixed(1);
            emotionStatus.value = `${primary.emotion} ${pct} · 保持${holdSec}s`;
          } else {
            emotionStatus.value = `${primary.emotion} ${pct}`;
          }

          if (isRecommending.value) {
            console.log('正在进行推荐，跳过此次检测');
            return;
          }

          if (primary.confidence >= emotionConfidenceThreshold) {
            if (primary.key === currentEmotion.value) {
              const holdDuration = Date.now() - emotionStartTime.value;
              console.log('表情持续时间:', holdDuration / 1000, '秒');

              if (holdDuration >= emotionHoldDurationMs) {
                console.log(`表情持续时间达到${emotionHoldDurationMs / 1000}秒，进行音乐推荐`);

                if (player.isPlaying) {
                  console.log('歌曲正在播放，将表情标记为待推荐');
                  pendingEmotion.value = primary.key;
                  pendingEmotionType.value = primary.type;
                  pendingEmotionConfidence.value = primary.confidence;
                  console.log('待推荐表情:', pendingEmotion.value, '→', pendingEmotionType.value);
                  currentEmotion.value = null;
                  emotionStartTime.value = null;
                } else {
                  console.log('歌曲没有在播放，直接进行推荐');
                  isRecommending.value = true;

                  const emotionType = primary.type;
                  const confidence = primary.confidence;

                  console.log('情绪检测结果:', {
                    primaryEmotion: primary.key,
                    confidence,
                    mappedEmotionType: emotionType
                  });
                  
                  // 发送情绪结果到后端
                  import('@/utils/api').then(({ emotionApi, songApi }) => {
                    console.log('调用后端情绪推荐API:', {
                      emotionType,
                      confidence
                    });
                    emotionApi.recommendByEmotion(emotionType, confidence)
                      .then((response) => {
                        console.log('情绪推荐响应:', response);
                        if (response.code === 200 && response.data && response.data.recommendedSongs) {
                          const recommendedSongs = response.data.recommendedSongs;
                          console.log('推荐的音乐:', recommendedSongs);
                          
                          // 检查推荐的音乐类型
                          const musicTypes = recommendedSongs.map(song => song.emotion).filter(Boolean);
                          console.log('推荐音乐的情绪类型:', musicTypes);
                          
                          // 如果有推荐的音乐，随机选择一首播放
                          if (recommendedSongs.length > 0) {
                            const randomIndex = Math.floor(Math.random() * recommendedSongs.length);
                            const selectedSong = recommendedSongs[randomIndex];
                            console.log('随机选择的音乐:', selectedSong);
                            // 导入播放器store并更新播放列表
                            import('@/store/player').then(({ usePlayerStore }) => {
                              const playerStore = usePlayerStore();
                              playerStore.setPlaylist(recommendedSongs, randomIndex);
                              console.log('已更新播放列表并开始播放推荐音乐');
                              
                              // 推荐完成后立即重置推荐标志，允许继续进行表情检测
                              isRecommending.value = false;
                              console.log('推荐完成，重置推荐标志');
                              
                              // 监听歌曲播放完毕事件，重置表情跟踪并检查待推荐表情
                              setTimeout(() => {
                                if (playerStore.audio) {
                                  playerStore.audio.onEnded(() => {
                                    console.log('歌曲播放完毕，处理待推荐表情');
                                    // 重置表情跟踪，以便进行下一轮推荐
                                    currentEmotion.value = null;
                                    emotionStartTime.value = null;
                                    
                                    // 检查是否有待推荐的表情
                                    if (pendingEmotion.value) {
                                      console.log('有等待推荐的表情，进行推荐');
                                      const emotionType = pendingEmotionType.value || 'calm';

                                      // 发送待推荐的表情到后端
                                      emotionApi.recommendByEmotion(emotionType, pendingEmotionConfidence.value)
                                        .then((response) => {
                                          console.log('待推荐表情响应:', response);
                                          if (response.code === 200 && response.data && response.data.recommendedSongs) {
                                            const recommendedSongs = response.data.recommendedSongs;
                                            console.log('推荐的音乐:', recommendedSongs);

                                            if (recommendedSongs.length > 0) {
                                              const randomIndex = Math.floor(Math.random() * recommendedSongs.length);
                                              const selectedSong = recommendedSongs[randomIndex];
                                              console.log('随机选择的音乐:', selectedSong);

                                              playerStore.setPlaylist(recommendedSongs, randomIndex);
                                              console.log('已更新播放列表并开始播放推荐音乐');
                                            }
                                          }

                                          // 重置待推荐表情
                                          pendingEmotion.value = null;
                                          pendingEmotionType.value = null;
                                          pendingEmotionConfidence.value = null;
                                        })
                                        .catch((error) => {
                                          console.error('待推荐表情推荐失败:', error);
                                          // 重置待推荐表情
                                          pendingEmotion.value = null;
                                          pendingEmotionType.value = null;
                                          pendingEmotionConfidence.value = null;
                                        });
                                    }
                                  });
                                }
                              }, 1000);
                            });
                          } else {
                            // 没有推荐的音乐，重置推荐标志
                            isRecommending.value = false;
                            console.log('没有推荐的音乐，重置推荐标志');
                            // 重置表情跟踪，以便进行下一轮推荐
                            currentEmotion.value = null;
                            emotionStartTime.value = null;
                          }
                        } else {
                          // 推荐失败，重置推荐标志
                          isRecommending.value = false;
                          console.log('推荐失败，重置推荐标志');
                          // 重置表情跟踪，以便进行下一轮推荐
                          currentEmotion.value = null;
                          emotionStartTime.value = null;
                        }
                      })
                      .catch((error) => {
                        console.error('情绪推荐失败，尝试从曲库中过滤相应类型的歌曲:', error);
                        // 情绪推荐失败，根据情绪类型从曲库中过滤相应类型的歌曲
                        songApi.getSongList()
                          .then((response) => {
                            console.log('获取歌曲列表响应:', response);
                            if (response.code === 200 && response.data && response.data.list && response.data.list.length > 0) {
                              const allSongs = response.data.list;
                              let filteredSongs = [];

                              // 按歌曲 mood_type 情绪类型过滤（happy/excited 归为欢快）
                              const matchTypes = emotionType === 'happy' ? ['happy', 'excited'] : [emotionType];
                              filteredSongs = allSongs.filter(song =>
                                matchTypes.includes(song.mood_type)
                              );
                              console.log(`按情绪类型 ${matchTypes.join('/')} 过滤出 ${filteredSongs.length} 首`);

                              // 如果过滤后没有歌曲，使用所有歌曲
                              if (filteredSongs.length === 0) {
                                filteredSongs = allSongs;
                                console.log('过滤后没有歌曲，使用所有歌曲:', filteredSongs);
                              }
                              
                              // 随机选择一首歌曲播放
                              const randomIndex = Math.floor(Math.random() * filteredSongs.length);
                              const selectedSong = filteredSongs[randomIndex];
                              console.log('随机选择的歌曲:', selectedSong);
                              import('@/store/player').then(({ usePlayerStore }) => {
                                const playerStore = usePlayerStore();
                                playerStore.setPlaylist(filteredSongs, randomIndex);
                                console.log('已更新播放列表并开始播放推荐音乐');
                                
                                // 推荐完成后立即重置推荐标志，允许继续进行表情检测
                                isRecommending.value = false;
                                console.log('推荐完成，重置推荐标志');
                                
                                // 监听歌曲播放完毕事件，重置表情跟踪并检查待推荐表情
                                setTimeout(() => {
                                  if (playerStore.audio) {
                                    playerStore.audio.onEnded(() => {
                                      console.log('歌曲播放完毕，处理待推荐表情');
                                      // 重置表情跟踪，以便进行下一轮推荐
                                      currentEmotion.value = null;
                                      emotionStartTime.value = null;
                                      
                                      // 检查是否有待推荐的表情
                                      if (pendingEmotion.value) {
                                        console.log('有等待推荐的表情，进行推荐');
                                        // 直接从曲库中按 mood_type 过滤相应类型的歌曲
                                        const pendingType = pendingEmotionType.value || 'calm';
                                        const matchTypes = pendingType === 'happy' ? ['happy', 'excited'] : [pendingType];

                                        let filteredSongs = allSongs.filter(song =>
                                          matchTypes.includes(song.mood_type)
                                        );

                                        if (filteredSongs.length === 0) {
                                          filteredSongs = allSongs;
                                        }

                                        const randomIndex = Math.floor(Math.random() * filteredSongs.length);
                                        const selectedSong = filteredSongs[randomIndex];
                                        console.log('随机选择的音乐:', selectedSong);

                                        playerStore.setPlaylist(filteredSongs, randomIndex);
                                        console.log('已更新播放列表并开始播放推荐音乐');

                                        // 重置待推荐表情
                                        pendingEmotion.value = null;
                                        pendingEmotionType.value = null;
                                        pendingEmotionConfidence.value = null;
                                      }
                                    });
                                  }
                                }, 1000);
                              });
                            } else {
                              // 没有获取到歌曲列表，重置推荐标志
                              isRecommending.value = false;
                              console.log('没有获取到歌曲列表，重置推荐标志');
                              // 重置表情跟踪，以便进行下一轮推荐
                              currentEmotion.value = null;
                              emotionStartTime.value = null;
                            }
                          })
                          .catch((error) => {
                            console.error('获取歌曲列表失败:', error);
                            // 获取歌曲列表失败，重置推荐标志
                            isRecommending.value = false;
                            console.log('获取歌曲列表失败，重置推荐标志');
                            // 重置表情跟踪，以便进行下一轮推荐
                            currentEmotion.value = null;
                            emotionStartTime.value = null;
                          });
                      });
                  });
                  
                  // 重置表情跟踪，避免重复推荐
                  currentEmotion.value = null;
                  emotionStartTime.value = null;
                }
              }
            } else {
              // 表情变化，更新当前跟踪的表情和开始时间
              console.log('表情变化，更新跟踪信息');
              currentEmotion.value = primary.key;
              emotionStartTime.value = Date.now();
            }
          } else {
            console.log('情绪置信度低于阈值，不进行跟踪');
            // 置信度低于阈值，重置表情跟踪
            currentEmotion.value = null;
            emotionStartTime.value = null;
          }
        } else {
          // 没有检测到表情，随机播放曲库中的任意一首歌曲
          console.log('没有检测到表情，随机播放曲库中的任意一首歌曲');
          
          // 只检查是否正在进行推荐，允许在歌曲播放期间继续进行表情检测
          if (!isRecommending.value) {
            // 只有当歌曲没有在播放时，才进行随机播放
            if (!player.isPlaying) {
              import('@/utils/api').then(({ songApi }) => {
                songApi.getSongList()
                  .then((response) => {
                    console.log('获取歌曲列表响应:', response);
                    if (response.code === 200 && response.data && response.data.list && response.data.list.length > 0) {
                      const allSongs = response.data.list;
                      const randomIndex = Math.floor(Math.random() * allSongs.length);
                      const randomSong = allSongs[randomIndex];
                      console.log('随机选择的歌曲:', randomSong);
                      import('@/store/player').then(({ usePlayerStore }) => {
                        const playerStore = usePlayerStore();
                        playerStore.setPlaylist(allSongs, randomIndex);
                        console.log('已更新播放列表并开始播放随机歌曲');
                        
                        // 监听歌曲播放完毕事件，重置推荐标志
                        setTimeout(() => {
                          if (playerStore.audio) {
                            playerStore.audio.onEnded(() => {
                              console.log('歌曲播放完毕，重置推荐标志');
                              isRecommending.value = false;
                            });
                          }
                        }, 1000);
                      });
                    }
                  })
                  .catch((error) => {
                    console.error('获取歌曲列表失败:', error);
                  });
              });
            }
          }
        }
      } else {
        emotionResults.value = [];
        emotionStatus.value = '未检测到人脸，请正对摄像头';
      }
      
    } catch (error) {
      console.error('情绪识别错误:', error);
      if (error.message.includes('faceapi is not defined')) {
        cameraError.value = '情绪识别库未正确加载';
      }
    }
    
    // 每300ms检测一次
    if (isEmotionDetectionRunning && cameraVisible.value) {
      setTimeout(detectEmotions, 300);
    }
  };
  
  detectEmotions();
};

// 停止情绪识别
const stopEmotionDetection = () => {
  isEmotionDetectionRunning = false;
  if (emotionDetectionInterval) {
    clearInterval(emotionDetectionInterval);
    emotionDetectionInterval = null;
  }
  
  if (emotionCtx) {
    emotionCtx.clearRect(0, 0, emotionCanvas.width, emotionCanvas.height);
  }
  // 在停止或切换到手势模式时隐藏情绪画布，避免视觉干扰
  if (emotionCanvas) {
    emotionCanvas.style.display = 'none';
  }
  emotionResults.value = [];
  emotionStatus.value = '';
};

// 绘制人脸框
const drawFaceBox = (box, emotion, confidence) => {
  if (!emotionCtx) return;
  
  const ctx = emotionCtx;
  const color = '#FFFFFF'; // 使用默认白色
  
  // 绘制矩形框
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  
  // 绘制标题栏背景
  ctx.fillStyle = color + 'CC'; // 添加透明度
  ctx.fillRect(box.x, box.y - 25, 120, 25);
  
  // 绘制标题栏边框
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y - 25, 120, 25);
};

// 绘制情绪标签
const drawEmotionLabel = (box, emotion, confidence) => {
  if (!emotionCtx) return;
  
  const ctx = emotionCtx;
  const text = emotionLabels[emotion] || emotion;
  const confidenceText = `${(confidence * 100).toFixed(1)}%`;
  
  // 设置文本样式
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  // 绘制情绪文本
  ctx.fillText(text, box.x + 5, box.y - 12);
  
  // 绘制置信度
  ctx.font = '10px Arial';
  ctx.fillStyle = '#F0F0F0';
  ctx.fillText(confidenceText, box.x + 5, box.y - 2);
};

// 绘制面部关键点
const drawFaceLandmarks = (landmarks) => {
  if (!emotionCtx) return;
  
  const ctx = emotionCtx;
  ctx.fillStyle = '#FF9800';
  ctx.strokeStyle = '#FF9800';
  ctx.lineWidth = 1;
  
  // 绘制所有关键点
  landmarks.positions.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
    ctx.fill();
  });
};

// 手势识别结果处理
// 添加防抖机制：只有当手势真正变化时才更新显示状态，避免闪烁
const onHandResults = (results) => {
  if (!results.multiHandLandmarks.length) {
    // 只有当之前不是未检测到状态时才更新
    if (gestureStatus.value !== '未检测到手，请举到画面中央') {
      gestureStatus.value = '未检测到手，请举到画面中央';
    }
    return;
  }

  const lm = results.multiHandLandmarks[0];
  const now = Date.now();
  
  // 当前帧计算的手势状态
  let currentGesture = '';

  // 传统的手指向上判断函数
  const fingerUp = (tip, pip) => lm[tip].y < lm[pip].y;

  const thumb = lm[4].x < lm[3].x;
  const indexUp = fingerUp(8, 6);
  const middle = fingerUp(12, 10);
  const ring = fingerUp(16, 14);
  const pinky = fingerUp(20, 18);

  // 计算手指伸直程度（0~1，越接近1越直）
  const calculateFingerExtension = (tip, dip, pip, mcp) => {
    const tipToDip = Math.sqrt(
      Math.pow(lm[tip].x - lm[dip].x, 2) + 
      Math.pow(lm[tip].y - lm[dip].y, 2)
    );
    const dipToPip = Math.sqrt(
      Math.pow(lm[dip].x - lm[pip].x, 2) + 
      Math.pow(lm[dip].y - lm[pip].y, 2)
    );
    const pipToMcp = Math.sqrt(
      Math.pow(lm[pip].x - lm[mcp].x, 2) + 
      Math.pow(lm[pip].y - lm[mcp].y, 2)
    );
    const totalLength = tipToDip + dipToPip + pipToMcp;
    const straightLength = Math.sqrt(
      Math.pow(lm[tip].x - lm[mcp].x, 2) + 
      Math.pow(lm[tip].y - lm[mcp].y, 2)
    );
    return straightLength / totalLength;
  };
  
  const indexExtension = calculateFingerExtension(8, 7, 6, 5);
  const middleExtension = calculateFingerExtension(12, 11, 10, 9);
  const ringExtension = calculateFingerExtension(16, 15, 14, 13);
  const pinkyExtension = calculateFingerExtension(20, 19, 18, 17);

  // 单一阈值二分类：伸直率 >= 阈值即为伸直，否则视为弯曲
  // 旧版伸直 0.8 / 弯曲 0.85 之间存在死区（0.8~0.85 的手指两头都不算），导致手势漏判
  const EXTENSION_THRESHOLD = 0.8;

  const isIndexExtended = indexExtension >= EXTENSION_THRESHOLD;
  const isMiddleExtended = middleExtension >= EXTENSION_THRESHOLD;
  const isRingExtended = ringExtension >= EXTENSION_THRESHOLD;
  const isPinkyExtended = pinkyExtension >= EXTENSION_THRESHOLD;
  const isIndexCurled = !isIndexExtended;
  const isMiddleCurled = !isMiddleExtended;
  const isRingCurled = !isRingExtended;
  const isPinkyCurled = !isPinkyExtended;
  
  const isIndexUp = lm[8].y < lm[5].y - 0.015;
  const isIndexDown = lm[8].y > lm[5].y + 0.015;

  // 统计伸直/弯曲手指数，提高容错率
  const extendedCount = [
    isIndexExtended,
    isMiddleExtended,
    isRingExtended,
    isPinkyExtended,
  ].filter(Boolean).length;

  const curledCount = [
    isIndexCurled,
    isMiddleCurled,
    isRingCurled,
    isPinkyCurled,
  ].filter(Boolean).length;
  
  // 手势判断逻辑 - 先计算当前手势，然后只在手势变化时更新显示，避免闪烁
  // 动作触发统一冷却：GESTURE_COOLDOWN_MS，由 triggerGestureAction 统一上锁
  // 1) 食指向上：上一首（保证其它三指大多未伸直即可）
  if (isIndexExtended && extendedCount === 1 && isIndexUp) {
    currentGesture = '👆 食指向上 - 上一首';
    if (!gestureLock) {
      triggerGestureAction(() => player.prev());
    }
  }
  // 2) 食指向下：下一首
  else if (isIndexExtended && extendedCount === 1 && isIndexDown) {
    currentGesture = '👇 食指向下 - 下一首';
    if (!gestureLock) {
      triggerGestureAction(() => player.next());
    }
  }
  // 3) 握拳：多数手指弯曲，且几乎没有伸直手指
  else if (curledCount >= 3 && extendedCount <= 1) {
    // 根据播放状态确定显示文本
    if (player.isPlaying && !isPausedByFist) {
      currentGesture = '✊ 握拳：暂停播放';
      if (!gestureLock) {
        triggerGestureAction(() => {
          player.pause();
          isPausedByFist = true;
        });
      }
    } else if (isPausedByFist && !player.isPlaying) {
      currentGesture = '✊ 握拳（已暂停）';
    } else {
      currentGesture = '✊ 握拳';
    }
  }
  // 4) 张开手掌：多数手指伸直
  else if (extendedCount >= 3) {
    // 根据播放状态确定显示文本
    if (isPausedByFist && !player.isPlaying) {
      currentGesture = '✋ 手掌打开：继续播放';
      if (!gestureLock) {
        triggerGestureAction(() => {
          player.play();
          isPausedByFist = false;
        });
      }
    } else {
      currentGesture = '✋ 手掌打开';
    }
  }
  // 5) 未识别的手势
  else {
    currentGesture = '🤚 未识别手势，请尝试食指/握拳/手掌';
  }

  // 只有当手势真正变化时才更新显示，避免闪烁
  if (currentGesture !== gestureStatus.value) {
    gestureStatus.value = currentGesture;
  }
};

// 触发手势动作（统一防抖：上锁后 GESTURE_COOLDOWN_MS 内忽略新手势）
const GESTURE_COOLDOWN_MS = 800;
const triggerGestureAction = (action) => {
  gestureLock = true;
  lastGestureTime = Date.now();

  // 执行动作
  action();

  // 冷却结束后解锁
  setTimeout(() => {
    gestureLock = false;
  }, GESTURE_COOLDOWN_MS);
};

// 关闭摄像头
const closeCamera = () => {
  // 停止情绪识别
  stopEmotionDetection();
  
  // 停止手势识别
  stopGestureDetection();
  
  // 关闭摄像头流
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  
  // 重置变量
  video = null;
  gestureCanvas = null;
  emotionCanvas = null;
  gestureCtx = null;
  emotionCtx = null;
  isPausedByFist = false;
  hands = null;
  
  cameraVisible.value = false;
  showProgress.value = true;
  cameraStatus.value = '';
  gestureStatus.value = '';
  emotionStatus.value = '';
  emotionResults.value = [];

  console.log('摄像头已关闭');
};

// 页面加载逻辑（保持原有）
onMounted(async () => {
  const user = uni.getStorageSync('userInfo');
  const loginTime = uni.getStorageSync('loginTime');
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  if (!user || !loginTime || (now - loginTime > oneDay)) {
    uni.reLaunch({ url: '/pages/auth/auth' });
    return;
  }
  
  try { 
    await authApi.getCurrentUser(); 
  } catch (e) { 
    console.log('获取用户信息失败，忽略错误'); 
  }
  
  // 加载歌曲列表
  console.log('开始加载歌曲列表...');
  
  try {
    let songRes;
    let raw = [];
    
    try {
      songRes = await songApi.getSongList();
      console.log('获取歌曲列表响应:', songRes);
      
      raw = Array.isArray(songRes)
        ? songRes
        : Array.isArray(songRes.data)
        ? songRes.data
        : Array.isArray(songRes.data?.list)
        ? songRes.data.list
        : (songRes.data?.data || []);
    } catch (error) {
      console.error('API请求失败，但尝试解析错误对象中的响应数据:', error);
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
    
    console.log('处理后的原始数据长度:', raw.length);

    const songs = raw.map((s, index) => {
      const url = s.url || s.mp3Url || s.fileUrl || s.path || s.audioUrl || s.songUrl || s.streamUrl || s.playUrl;
      return { ...s, url, id: s.id || index + 1 };
    }).filter(s => s.url);

    console.log('过滤后歌曲数量:', songs.length);

    musicStore.setLikedSongs(songs);
    
    if (songs.length > 0) {
      console.log('设置播放列表并自动播放第一首');
      player.setPlaylist(songs, 0);
      
      // 监听歌曲播放完毕事件
      setTimeout(() => {
        if (player.audio) {
          console.log('添加歌曲播放完毕事件监听器');
          player.audio.onEnded(() => {
            console.log('歌曲播放完毕，开始推荐下一首');
            // 触发情绪检测和推荐
            if (cameraVisible.value) {
              // 如果摄像头已开启，直接进行情绪检测
              console.log('摄像头已开启，进行情绪检测');
              // 这里不需要手动触发，因为情绪检测已经在循环中运行
            } else {
              // 如果摄像头未开启，随机播放一首歌曲
              console.log('摄像头未开启，随机播放一首歌曲');
              import('@/utils/api').then(({ songApi }) => {
                songApi.getSongList()
                  .then((response) => {
                    if (response.code === 200 && response.data && response.data.list && response.data.list.length > 0) {
                      const allSongs = response.data.list;
                      const randomIndex = Math.floor(Math.random() * allSongs.length);
                      const selectedSong = allSongs[randomIndex];
                      console.log('随机选择的歌曲:', selectedSong);
                      player.setPlaylist(allSongs, randomIndex);
                      console.log('已更新播放列表并开始播放随机歌曲');
                    }
                  })
                  .catch((error) => {
                    console.error('获取歌曲列表失败:', error);
                  });
              });
            }
          });
        }
      }, 1000);
    } else {
      console.warn('歌曲列表为空，无法自动播放');
    }
  } catch (error) {
    console.error('加载歌曲列表失败:', error);
    
    if (musicStore.likedSongs.length > 0) {
      console.log('使用store中已有的歌曲');
      player.setPlaylist(musicStore.likedSongs, 0);
    } else {
      console.warn('store中也没有歌曲，无法播放');
    }
  }
});

const togglePlay = () => player.toggle();
const prevSong = () => player.prev();
const nextSong = () => player.next();
const formatTime = (s) => {
  if (!s) return '00:00';
  const m = Math.floor(s / 60);
  const rs = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
};

const goToMyMusic = () => uni.navigateTo({ url: '/pages/myMusic/myMusic' });
onUnmounted(() => {
  closeCamera();
});
</script>

<style scoped>
/* 页面基础样式 */
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: #122d2a;
  padding: 20px;
  box-sizing: border-box;
  position: relative;
}

.gesture-btn {
  position: absolute;
  top: 40px;
  left: 20px;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 15px;
  border-radius: 20px;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.gesture-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.camera-container {
  position: fixed;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 300px;
  background: #000;
  border-radius: 20px;
  z-index: 1000;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

/* 分区状态条：系统提示 + 手势/情绪分栏，互不覆盖 */
.camera-status-bar {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}

.status-line {
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  text-align: center;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 500;
}

.status-line.error-line {
  color: #ffb4b4;
  border-color: rgba(255, 107, 107, 0.4);
  background: rgba(60, 10, 10, 0.7);
}

.status-row {
  display: flex;
  gap: 6px;
}

.status-chip {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(224, 255, 240, 0.18);
  border-radius: 10px;
  padding: 5px 8px;
  backdrop-filter: blur(8px);
}

.chip-tag {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: #173d36;
  background: #9fe8c8;
  padding: 1px 6px;
  border-radius: 8px;
}

.chip-text {
  font-size: 11px;
  color: #eafff5;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 关闭按钮样式：紧凑圆形，贴合摄像头画面右下角 */
.close-camera {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(16, 31, 37, 0.65);
  border-radius: 50%;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  z-index: 1003;
  transition: all 0.25s ease;
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.close-camera:hover {
  color: #fff;
  background: rgba(245, 87, 108, 0.85);
  border-color: rgba(245, 87, 108, 0.5);
  transform: scale(1.08);
  box-shadow: 0 4px 14px rgba(245, 87, 108, 0.35);
}

/* 播放器核心 UI 样式 */
.album-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 60px;
}

.album-cover {
  width: 280px;
  height: 280px;
  border-radius: 30px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  margin-bottom: 30px;
  transition: all 0.5s ease;
  border: 3px solid rgba(255, 255, 255, 0.1);
}

.album-cover:hover {
  transform: translateY(-5px);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.cover-image:hover {
  transform: scale(1.05);
}

.song-info {
  text-align: center;
  margin-bottom: 30px;
  max-width: 90%;
}

.song-title {
  font-size: 24px;
  color: #fff;
  font-weight: 700;
  display: block;
  margin-bottom: 8px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.song-artist {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 400;
}

/* 进度条样式 */
.progress-section {
  width: 90%;
  margin-top: 30px;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 3px;
  transition: width 0.1s linear;
  position: relative;
}

.progress-slider {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background-color: #fff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  z-index: 100;
}

.progress-slider:active {
  transform: translate(-50%, -50%) scale(1.2);
  box-shadow: 0 0 20px rgba(118, 75, 162, 0.5);
}

.time-info {
  display: flex;
  justify-content: space-between;
  color: #fff;
  font-size: 13px;
  margin-top: 10px;
  font-weight: 500;
}

.current-time {
  opacity: 0.9;
}

.total-time {
  opacity: 0.7;
}

/* 控制栏样式 */
.control-bar {
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 30px 0;
  margin-bottom: 30px;
  position: relative;
}

.control-btn {
  background: none;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 10px;
  border-radius: 50%;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-btn {
  background: transparent;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border: none;
}

.play-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

/* 我的按钮样式 */
.my-btn {
  background: transparent;
  border: none;
  padding: 12px 20px;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border-radius: 20px;
}

.my-btn:hover {
  transform: translateY(-3px);
  background: transparent;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.my-btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.user-icon {
  margin-bottom: 4px;
  opacity: 0.9;
}

.my-btn-text {
  font-size: 13px;
  color: #fff;
  font-weight: 600;
  line-height: 1;
}

/* 错误提示样式 */
.camera-error {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 10px 20px;
  border-radius: 15px;
  font-size: 13px;
  font-weight: 500;
  z-index: 1004;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 107, 107, 0.3);
  text-align: center;
  max-width: 80%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page {
    padding: 15px;
  }
  
  .gesture-btn, .emotion-btn {
    top: 20px;
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .gesture-btn {
    left: 15px;
  }
  
  .emotion-btn {
    right: 15px;
  }
  
  .camera-container {
    width: 90vw;
    height: 67.5vw; /* 16:9比例 */
    top: 10%;
  }
  
  .album-cover {
    width: 240px;
    height: 240px;
  }
  
  .song-title {
    font-size: 20px;
  }
  
  .song-artist {
    font-size: 14px;
  }
  
  .control-bar {
    padding: 20px 0;
  }
  
  .play-btn {
    width: 60px;
    height: 60px;
  }
  
  .my-btn {
    padding: 10px 15px;
    min-width: 80px;
  }

  .mode-switcher {
    gap: 8px;
    padding: 6px;
  }
  
  .mode-btn {
    padding: 6px 12px;
    min-width: 70px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .album-cover {
    width: 200px;
    height: 200px;
  }
  
  .song-title {
    font-size: 18px;
  }
  
  .song-artist {
    font-size: 13px;
  }
  
  .control-bar {
    padding: 15px 0;
  }

  .play-btn {
    width: 55px;
    height: 55px;
  }
}

/* 加载动画 */
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.loading-text {
  animation: pulse 1.5s infinite;
}

/* 状态指示灯 */
.status-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  background: #4CAF50;
  box-shadow: 0 0 10px #4CAF50;
}

.status-indicator.loading {
  background: #FF9800;
  box-shadow: 0 0 10px #FF9800;
  animation: pulse 1s infinite;
}

.status-indicator.error {
  background: #F44336;
  box-shadow: 0 0 10px #F44336;
}

/* 画布样式优化 */
#gesture-canvas, #emotion-canvas {
  border-radius: 18px;
}

/* 全局状态提示 */
.global-status {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9998;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  max-width: 90%;
  text-align: center;
  opacity: 0;
  animation: fadeIn 0.3s forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* 情绪识别画布特殊效果 */
#emotion-canvas {
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

/* 摄像头画面效果优化 */
#h5-raw-video {
  filter: contrast(1.05) brightness(1.02);
}

/* 手机竖屏布局 */
.page {
  width: 100%; max-width: 430px; margin: 0 auto;
  min-height: calc(100vh - 44px);
  min-height: calc(100dvh - 44px);
  padding: 18px 22px calc(18px + env(safe-area-inset-bottom, 0px));
  gap: 20px;
}
.gesture-btn {
  position: relative; top: auto; left: auto; align-self: flex-start;
  box-sizing: border-box; max-width: 100%; min-height: 44px;
  padding: 10px 14px; font-size: 13px;
}
.album-section { margin-top: 0; gap: 24px; min-width: 0; }
.album-cover {
  box-sizing: border-box; width: min(76%, 280px); height: auto;
  aspect-ratio: 1; flex-shrink: 0; margin-bottom: 0;
}
.song-info { width: 100%; max-width: 100%; margin-bottom: 0; }
.song-title { font-size: 22px; overflow-wrap: anywhere; }
.song-artist { font-size: 14px; overflow-wrap: anywhere; }
.progress-section { width: 100%; margin-top: 0; padding: 12px 0; }
.progress-slider::before { content: ''; position: absolute; inset: -14px; }
.progress-slider { touch-action: none; }
.control-bar {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px; padding: 12px 0; margin-bottom: 0; flex-shrink: 0;
}
.control-btn { margin: 0 auto; min-width: 44px; min-height: 44px; padding: 8px; }
.play-btn { width: 64px; height: 64px; }
.my-btn { min-width: 44px; padding: 8px; }
.camera-container {
  /* 固定悬浮层：不参与页面排版，避免打开摄像头把页面撑长 */
  position: fixed; top: 76px; left: 50%; transform: translateX(-50%);
  width: min(92vw, 60vh, 430px); height: auto; aspect-ratio: 4 / 3;
  box-sizing: border-box; flex-shrink: 0; z-index: 1000;
}
.camera-video-wrap, .camera-video { position: absolute; inset: 0; width: 100%; height: 100%; }
.camera-status-bar { top: 8px; left: 8px; right: 8px; gap: 4px; }
.status-chip { padding: 4px 6px; }
.chip-text { font-size: 10px; }
.global-status { width: calc(100% - 40px); max-width: 370px; box-sizing: border-box; }
@media (max-height: 700px) {
  .page { gap: 12px; }
  .album-section { gap: 16px; }
  .album-cover { width: min(60%, 220px); }
}


/* 简洁播放器：深青背景、薄荷色主控件、三个居中播放按钮 */
.page {
  background:
    radial-gradient(ellipse at 12% 5%, #3d74634d 0%, transparent 52%),
    radial-gradient(ellipse at 100% 52%, #53737926 0%, transparent 55%),
    linear-gradient(165deg, #23483e 0%, #152f2e 52%, #101f25 100%);
  padding: 22px 28px calc(30px + env(safe-area-inset-bottom, 0px));
  gap: 24px;
}
.player-header { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 12px; }
.gesture-btn, .library-btn {
  position: relative; margin: 0; min-height: 44px; padding: 10px 12px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 1px solid #e0fff017; border-radius: 16px;
  background: #f0fff509; color: #d8e9e1;
  font-size: 12px; line-height: 1.4; font-weight: 500;
  box-shadow: none; box-sizing: border-box;
}
.gesture-btn::after, .library-btn::after, .control-btn::after { content: none; border: none; }
.gesture-btn.active { background: #b9e5cf18; border-color: #b9e5cf55; color: #c4efd9; }
.recognition-dot { width: 5px; height: 5px; border-radius: 50%; background: #748f85; }
.recognition-dot.active { background: #b6efca; box-shadow: 0 0 8px #b6efca66; }
.album-section { justify-content: center; gap: 28px; padding-top: 24px; }
.album-cover {
  width: 100%; max-width: 300px; height: auto; aspect-ratio: 1;
  border-radius: 28px; border: 1px solid #ffffff22;
  box-shadow: 0 25px 50px #00000038, 0 0 50px #a0e2c608;
  background: #28433e; margin: 0;
}
.album-cover:hover { transform: none; box-shadow: 0 25px 50px #00000038; }
.cover-image:hover { transform: none; }
.song-info { margin: 0; width: 100%; text-align: left; }
.song-title {
  font-size: 24px; font-weight: 600; line-height: 1.45;
  letter-spacing: .3px; color: #f1f7f3; text-shadow: none; margin-bottom: 7px;
}
.song-artist { font-size: 13px; line-height: 1.6; color: #a2b9b0; }
.progress-section { padding: 12px 0 0; }
.progress-bar { height: 4px; background: #d8e9e126; border-radius: 8px; }
.progress-fill { background: #bee7d3; border-radius: 8px; }
.progress-slider { width: 12px; height: 12px; background: #e2f6eb; box-shadow: 0 0 0 4px #bee7d310; }
.time-info { margin-top: 13px; color: #9cb5ab; font-size: 11px; font-variant-numeric: tabular-nums; letter-spacing: .5px; }
.control-bar {
  grid-template-columns: 1fr 84px 1fr; max-width: 300px;
  margin: 0 auto; padding: 8px 0 16px; gap: 20px;
}
.control-btn {
  width: 54px; height: 54px; min-width: 44px; padding: 0;
  border-radius: 50%; background: transparent;
}
.control-btn:hover { background: #ffffff08; transform: none; }
.control-btn:active { transform: scale(.94); }
.play-btn {
  width: 80px; height: 80px; background: #c8ead7;
  box-shadow: 0 8px 26px #00000020, 0 0 0 8px #c8ead707;
}
.play-btn:hover { background: #d9f2e3; transform: none; }
.play-btn:active { transform: scale(.96); }
.camera-container { border-radius: 22px; border-color: #c8ead72b; box-shadow: 0 14px 28px #00000026; }
@media (max-height: 700px) {
  .page { gap: 16px; padding-top: 16px; padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px)); }
  .album-section { padding-top: 8px; gap: 20px; }
  .album-cover { width: 72%; max-width: 230px; }
  .control-bar { padding-bottom: 4px; }
  .play-btn { width: 72px; height: 72px; }
}
@media (max-width: 350px) {
  .page { padding-left: 22px; padding-right: 22px; }
  .song-title { font-size: 21px; }
  .control-bar { gap: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .control-btn, .album-cover { transition: none; }
}

.seek-control { margin: 0; padding: 8px 0; }
</style>