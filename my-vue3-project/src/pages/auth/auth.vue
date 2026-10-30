<template>
  <view class="auth-container">
    <view class="ambient ambient-one" aria-hidden="true"></view>
    <view class="ambient ambient-two" aria-hidden="true"></view>
    <view class="brand"><view class="brand-mark">♪</view><text>情绪音岛</text></view>

    <view v-if="!entrySelected" class="welcome">
      <view class="island-art" aria-hidden="true">
        <view class="orbit orbit-one"></view><view class="orbit orbit-two"></view>
        <view class="island"><text class="island-note">♫</text></view>
        <view class="floating-note">♪</view><view class="spark">✦</view>
      </view>
      <text class="eyebrow">给心情，一点旋律</text>
      <text class="welcome-title">在这里，
听见你的心情。</text>
      <text class="welcome-copy">让音乐陪你放松，也陪你快乐。
属于你的情绪小岛，随时欢迎你。</text>
      <view class="entry-actions">
        <button class="auth-btn" @tap="chooseMode(true)">登录 <text class="button-arrow">→</text></button>
        <button class="secondary-btn" @tap="chooseMode(false)">注册新账号</button>
      </view>
      <text class="welcome-caption">从一首歌开始，遇见好心情</text>
    </view>

    <view v-else class="form-stage">
      <button class="back-btn" :disabled="submitting" @tap="backToWelcome">← 返回</button>
      <view class="form-heading">
        <text class="eyebrow">{{ isLogin ? '很高兴，再次遇见你' : '你的音乐旅程，即将开始' }}</text>
        <text class="form-title">{{ isLogin ? '欢迎回岛' : '创建你的账号' }}</text>
        <text class="form-description">{{ isLogin ? '登录后，继续聆听属于你的旋律。' : '简单几步，拥有自己的情绪小岛。' }}</text>
      </view>
      <view class="auth-form">
      <form class="form-content">
        <!-- 账号输入 -->
        <view class="input-group">
          <text class="input-label">账号</text>
          <view class="input-wrapper">
            
            <input 
              v-model="form.username" 
              type="text" 
              class="input-field" 
              placeholder="请输入您的账号" 
              placeholder-class="placeholder-text"
              :disabled="submitting"
              @input="clearFeedback"
              @confirm="handleSubmit"
            />
          </view>
        </view>
        
        <!-- 密码输入 -->
        <view class="input-group">
          <text class="input-label">密码</text>
          <view class="input-wrapper">
            
            <input 
              v-model="form.password" 
              :type="showPassword ? 'text' : 'password'" 
              class="input-field" 
              placeholder="请输入您的密码" 
              placeholder-class="placeholder-text"
              :disabled="submitting"
              @input="clearFeedback"
              @confirm="handleSubmit"
            />
            <button 
              type="button" 
              class="password-toggle" 
              @tap="togglePassword"
            >
              <text class="toggle-icon">{{ showPassword ? '隐藏' : '显示' }}</text>
            </button>
          </view>
        </view>
        
        <!-- 确认密码输入（仅注册） -->
        <view class="input-group" v-if="!isLogin">
          <text class="input-label">确认密码</text>
          <view class="input-wrapper">
            
            <input 
              v-model="form.confirmPassword" 
              :type="showConfirmPassword ? 'text' : 'password'" 
              class="input-field" 
              placeholder="请再次输入您的密码" 
              placeholder-class="placeholder-text"
              :disabled="submitting"
              @input="clearFeedback"
              @confirm="handleSubmit"
            />
            <button 
              type="button" 
              class="password-toggle" 
              @tap="toggleConfirmPassword"
            >
              <text class="toggle-icon">{{ showConfirmPassword ? '隐藏' : '显示' }}</text>
            </button>
          </view>
        </view>
        
        <view v-if="feedback" class="auth-feedback" :class="{ 'is-success': feedbackSuccess }" role="status" aria-live="polite">
          <text>{{ feedback }}</text>
        </view>
        <button type="button" class="auth-btn" :disabled="submitting" :loading="submitting" @tap="handleSubmit">
          <text class="auth-btn-text">{{ submitting ? (isLogin ? '登录中…' : '注册中…') : (isLogin ? '登录' : '注册') }}</text>
        </button>

        <!-- 切换登录/注册 -->
        <view class="toggle-link">
          <text class="toggle-text">{{ isLogin ? '还没有账号？' : '已有账号？' }}</text>
          <button class="toggle-btn" :disabled="submitting" @tap="toggleMode">{{ isLogin ? '立即注册' : '立即登录' }}</button>
        </view>
      </form>
      </view>
    </view>
    <text class="page-footer">情绪音岛 · 让每一种心情都有回响</text>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { authApi } from '@/utils/api';

const isLogin = ref(true);
const entrySelected = ref(false);
const chooseMode = (login) => {
  if (submitting.value) return;
  isLogin.value = login;
  clearPasswords();
  clearFeedback();
  entrySelected.value = true;
};
const backToWelcome = () => {
  if (submitting.value) return;
  clearPasswords();
  clearFeedback();
  entrySelected.value = false;
};
const form = ref({ username: '', password: '', confirmPassword: '' });
const submitting = ref(false);
const feedback = ref('');
const feedbackSuccess = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const togglePassword = () => { showPassword.value = !showPassword.value; };
const toggleConfirmPassword = () => { showConfirmPassword.value = !showConfirmPassword.value; };
const clearFeedback = () => { feedback.value = ''; feedbackSuccess.value = false; };
const clearPasswords = () => {
  form.value.password = '';
  form.value.confirmPassword = '';
  showPassword.value = false;
  showConfirmPassword.value = false;
};
const toggleMode = () => {
  if (submitting.value) return;
  isLogin.value = !isLogin.value;
  clearPasswords();
  clearFeedback();
};
const handleSubmit = async () => {
  if (submitting.value || !entrySelected.value) return;
  clearFeedback();
  const username = form.value.username.trim();
  const password = form.value.password;
  if (!username) { feedback.value = '请输入账号'; return; }
  if (!password.trim()) { feedback.value = '请输入密码'; return; }
  if (!isLogin.value) {
    if (password.length < 6) { feedback.value = '密码至少需要 6 位'; return; }
    if (!form.value.confirmPassword) { feedback.value = '请再次输入密码'; return; }
    if (password !== form.value.confirmPassword) { feedback.value = '两次输入的密码不一致，请重新确认'; return; }
  }
  submitting.value = true;
  try {
    if (isLogin.value) {
      const response = await authApi.login(username, password);
      if (!response?.data?.token || !response?.data?.user) {
        throw new Error('登录信息异常，请稍后重试');
      }
      uni.setStorageSync('token', response.data.token);
      uni.setStorageSync('userInfo', response.data.user);
      uni.setStorageSync('loginTime', Date.now());
      feedbackSuccess.value = true;
      feedback.value = '登录成功，正在进入首页…';
      uni.reLaunch({
        url: '/pages/index/index',
        fail: () => {
          feedbackSuccess.value = false;
          feedback.value = '登录成功，但首页打开失败，请重新点击登录';
        }
      });
    } else {
      await authApi.register(username, password);
      form.value.username = username;
      clearPasswords();
      isLogin.value = true;
      feedbackSuccess.value = true;
      feedback.value = '注册成功！请使用刚才的密码登录';
    }
  } catch (error) {
    feedbackSuccess.value = false;
    feedback.value = error?.message || '操作失败，请稍后重试';
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.auth-container {
  position: relative; isolation: isolate; overflow: hidden;
  box-sizing: border-box; width: 100%; max-width: 430px; margin: 0 auto;
  min-height: 100vh; min-height: 100dvh;
  padding: calc(28px + env(safe-area-inset-top, 0px)) 26px calc(22px + env(safe-area-inset-bottom, 0px));
  display: flex; flex-direction: column; color: #193f37;
  background: linear-gradient(155deg, #f5fbf4 0%, #e8f6ef 48%, #eaf6f8 100%);
}
button { box-sizing: border-box; font: inherit; }
button::after { border: none; }
.ambient { position: absolute; border-radius: 50%; z-index: -1; pointer-events: none; filter: blur(35px); }
.ambient-one { width: 280px; height: 280px; background: #d2efdc; top: 10%; right: -140px; opacity: .7; }
.ambient-two { width: 250px; height: 250px; background: #d5eaef; bottom: 10%; left: -150px; opacity: .7; }
.brand { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; letter-spacing: 2px; }
.brand-mark { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 12px; background: #216d59; color: white; font-size: 24px; }
.welcome { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 24px 0; }
.island-art { position: relative; width: 220px; height: 190px; align-self: center; margin: 0 0 24px; }
.orbit { position: absolute; border: 1px solid #badbce; border-radius: 50%; transform: rotate(-18deg); }
.orbit-one { width: 214px; height: 130px; top: 42px; left: 0; }
.orbit-two { width: 174px; height: 166px; top: 12px; left: 20px; transform: rotate(25deg); opacity: .65; }
.island { position: absolute; inset: 28px 42px; display: flex; align-items: center; justify-content: center; border-radius: 42% 58% 60% 40%; background: linear-gradient(140deg,#b7e6cc,#6cbaa0); box-shadow: inset 0 2px 3px #ffffff9c, 0 18px 40px #42987822; transform: rotate(-10deg); }
.island-note { color: #f7fffa; font-size: 70px; transform: rotate(10deg); text-shadow: 0 4px 12px #28795e20; }
.floating-note { position: absolute; top: 12px; right: 26px; color: #287e67; font-size: 30px; transform: rotate(12deg); }
.spark { position: absolute; left: 12px; bottom: 38px; color: #d6a959; font-size: 24px; }
.eyebrow { display: block; font-size: 12px; color: #49786a; letter-spacing: 2px; margin-bottom: 12px; }
.welcome-title { display: block; white-space: pre-line; font-size: 36px; line-height: 1.4; font-weight: 700; letter-spacing: 1px; }
.welcome-copy { display: block; white-space: pre-line; margin-top: 18px; font-size: 14px; line-height: 1.9; color: #5a776e; }
.entry-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 30px; }
.auth-btn, .secondary-btn { width: 100%; min-height: 52px; border-radius: 17px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; line-height: 1.5; padding: 14px 18px; }
.auth-btn { background: #216d59; color: #fff; box-shadow: 0 8px 20px #216d591a; }
.auth-btn:active { background: #185641; }
.secondary-btn { background: #ffffff80; border: 1px solid #b9d9cc; color: #245f4e; }
.button-arrow { margin-left: 14px; font-size: 20px; }
.welcome-caption { text-align: center; margin-top: 18px; font-size: 12px; color: #617d72; }
.page-footer { display: block; text-align: center; font-size: 11px; letter-spacing: 1px; color: #678176; margin-top: 20px; }
.form-stage { flex: 1; padding: 24px 0 12px; }
.back-btn { margin: 0 0 20px -8px; padding: 8px; width: fit-content; min-height: 44px; background: transparent; color: #406d5e; font-size: 14px; line-height: 28px; }
.form-heading { margin-bottom: 28px; }
.form-title { display: block; font-size: 30px; line-height: 1.4; font-weight: 700; }
.form-description { display: block; font-size: 13px; color: #5a776e; margin-top: 12px; line-height: 1.8; }
.auth-form { padding: 24px 20px; background: #ffffffb8; border: 1px solid #ffffff; border-radius: 26px; box-shadow: 0 12px 40px #284d3e08; }
.input-group { margin-bottom: 20px; }
.input-label { display: block; font-size: 13px; font-weight: 600; color: #355a4d; margin-bottom: 9px; }
.input-wrapper { display: flex; align-items: center; min-height: 52px; border: 1px solid #d8e7df; border-radius: 13px; padding: 0 12px; background: #f7faf8; }
.input-wrapper:focus-within { border-color: #418871; box-shadow: 0 0 0 3px #41887112; background: white; }
.input-field { flex: 1; min-width: 0; width: 100%; height: 50px; font-size: 16px; color: #193f37; }
.placeholder-text { color: #84998f; font-size: 14px; }
.password-toggle { margin: 0 -8px 0 4px; min-width: 44px; min-height: 44px; padding: 0 4px; background: transparent; color: #39745f; font-size: 12px; line-height: 44px; flex-shrink: 0; }
.auth-feedback { padding: 12px; margin-bottom: 18px; background: #fff0ed; color: #a3382d; border-radius: 12px; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
.auth-feedback.is-success { background: #e5f3e9; color: #276345; }
.toggle-link { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; margin-top: 16px; font-size: 13px; }
.toggle-text { color: #6a8075; }
.toggle-btn { margin: 0; padding: 0 6px; background: transparent; color: #216d59; font-size: 13px; font-weight: 600; line-height: 44px; min-height: 44px; }
button[disabled] { opacity: .6; }
@media (max-width: 350px) {
  .auth-container { padding-left: 20px; padding-right: 20px; }
  .auth-form { padding: 20px 14px; }
  .welcome-title { font-size: 32px; }
}
@media (max-height: 720px) {
  .island-art { height: 150px; margin-bottom: 14px; transform: scale(.85); }
  .welcome { padding-top: 12px; }
  .entry-actions { margin-top: 22px; }
  .form-stage { padding-top: 12px; }
  .back-btn { margin-bottom: 10px; }
}
@media (prefers-reduced-motion: no-preference) {
  .welcome, .form-stage { animation: arrive .3s ease-out; }
  @keyframes arrive { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
}
</style>
