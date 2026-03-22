<template>
  <view class="auth-container">
    <!-- 装饰性背景 -->
    <view class="background-decoration"></view>
    
    <!-- 登录/注册表单 -->
    <view class="auth-form">
      <!-- 应用Logo和标题 -->
      <view class="app-logo">
        <view class="logo-icon">
          <text class="music-icon">♪</text>
        </view>
        <view class="app-info">
          <text class="app-title">情绪音岛</text>
          <text class="app-slogan">{{ isLogin ? '欢迎回来，继续您的音乐之旅' : '创建账号，开启音乐之旅' }}</text>
        </view>
      </view>
      
      <!-- 表单内容 -->
      <form class="form-content">
        <!-- 账号输入 -->
        <view class="input-group">
          <text class="input-label">账号</text>
          <view class="input-wrapper">
            <text class="input-icon">👤</text>
            <input 
              v-model="form.username" 
              type="text" 
              class="input-field" 
              placeholder="请输入您的账号" 
              placeholder-class="placeholder-text"
            />
          </view>
        </view>
        
        <!-- 密码输入 -->
        <view class="input-group">
          <text class="input-label">密码</text>
          <view class="input-wrapper">
            <text class="input-icon">🔒</text>
            <input 
              v-model="form.password" 
              :type="showPassword ? 'text' : 'password'" 
              class="input-field" 
              placeholder="请输入您的密码" 
              placeholder-class="placeholder-text"
            />
            <button 
              type="button" 
              class="password-toggle" 
              @tap="togglePassword"
            >
              <text class="toggle-icon">{{ showPassword ? '👁️' : '👁️‍🗨️' }}</text>
            </button>
          </view>
        </view>
        
        <!-- 确认密码输入（仅注册） -->
        <view class="input-group" v-if="!isLogin">
          <text class="input-label">确认密码</text>
          <view class="input-wrapper">
            <text class="input-icon">🔒</text>
            <input 
              v-model="form.confirmPassword" 
              :type="showConfirmPassword ? 'text' : 'password'" 
              class="input-field" 
              placeholder="请再次输入您的密码" 
              placeholder-class="placeholder-text"
            />
            <button 
              type="button" 
              class="password-toggle" 
              @tap="toggleConfirmPassword"
            >
              <text class="toggle-icon">{{ showConfirmPassword ? '👁️' : '👁️‍🗨️' }}</text>
            </button>
          </view>
        </view>
        
        <!-- 登录/注册按钮 -->
        <button
  type="button"
  class="auth-btn"
  @tap="handleSubmit"
>
  <text class="auth-btn-text">{{ isLogin ? '登录' : '注册' }}</text>
</button>
        

        
        <!-- 切换登录/注册 -->
        <view class="toggle-link">
          <text class="toggle-text">{{ isLogin ? '还没有账号？' : '已有账号？' }}</text>
          <text class="toggle-btn" @click="toggleMode">{{ isLogin ? '立即注册' : '立即登录' }}</text>
        </view>
      </form>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { authApi } from '@/utils/api';
import { reactive } from 'vue'

// 登录/注册模式切换
const isLogin = ref(true);

// 表单数据
const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  rememberMe: false
});

// 密码显示状态
const showPassword = ref(false);
const showConfirmPassword = ref(false);

// 切换密码显示
const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

// 切换确认密码显示
const toggleConfirmPassword = () => {
  showConfirmPassword.value = !showConfirmPassword.value;
};

// 切换登录/注册模式
const toggleMode = () => {
  isLogin.value = !isLogin.value;
  // 重置表单
  form.value = {
    username: '',
    password: '',
    confirmPassword: '',
    rememberMe: false
  };
  showPassword.value = false;
  showConfirmPassword.value = false;
};

// 登录处理
const onLogin = async () => {
  // 表单验证
  if (!form.value.username.trim()) {
    uni.showToast({
      title: '请输入账号',
      icon: 'none'
    });
    return;
  }
 
  
  if (!form.value.password.trim()) {
    uni.showToast({
      title: '请输入密码',
      icon: 'none'
    });
    return;
  }
  
  // 显示加载中
  uni.showLoading({
    title: '登录中...'
  });
  
  try {
    // 调用登录API
    const response = await authApi.login(form.value.username, form.value.password);
    
    // 登录成功，保存token、用户信息和登录时间
    uni.setStorageSync('token', response.data.token);
    uni.setStorageSync('userInfo', response.data.user);
    uni.setStorageSync('loginTime', Date.now()); // 保存登录时间
    
    // 显示成功提示
    uni.showToast({
      title: '登录成功',
      icon: 'success'
    });
    
    // 跳转到首页
    uni.reLaunch({
      url: '/pages/index/index'
    });
  } catch (error) {
    // 登录失败，错误信息已经在API工具中处理
    console.error(error);
  } finally {
    // 隐藏加载中
    uni.hideLoading();
  }
};

// 注册处理
const onRegister = async () => {
  console.log('注册按钮点击');
  console.log('表单数据:', form.value);
  
  // 表单验证
  if (!form.value.username.trim()) {
    console.log('请输入账号');
    uni.showToast({
      title: '请输入账号',
      icon: 'none'
    });
    return;
  }
  
  if (!form.value.password.trim()) {
    console.log('请输入密码');
    uni.showToast({
      title: '请输入密码',
      icon: 'none'
    });
    return;
  }
  
  if (form.value.password.length < 6) {
    console.log('密码长度不能少于6位');
    uni.showToast({
      title: '密码长度不能少于6位',
      icon: 'none'
    });
    return;
  }
  
  if (form.value.password !== form.value.confirmPassword) {
    console.log('两次输入的密码不一致');
    console.log('密码:', form.value.password);
    console.log('确认密码:', form.value.confirmPassword);
    uni.showToast({
      title: '两次输入的密码不一致',
      icon: 'none'
    });
    return;
  }

  
  console.log('表单验证通过，准备调用API');
  
  // 显示加载中
  uni.showLoading({
    title: '注册中...'
  });
  
  try {
    // 调用注册API
    console.log('调用注册API');
    const response = await authApi.register(form.value.username, form.value.password);
    console.log('注册API返回:', response);
    
    // 注册成功，显示提示
    uni.showToast({
      title: '注册成功',
      icon: 'success'
    });
    
    // 切换到登录模式
    toggleMode();
  } catch (error) {
    // 注册失败，错误信息已经在API工具中处理
    console.error('注册失败:', error);
  } finally {
    // 隐藏加载中
    uni.hideLoading();
  }
};

// 忘记密码
const onForgotPassword = () => {
  uni.showToast({
    title: '忘记密码功能开发中',
    icon: 'none'
  });
};


const handleSubmit = () => {
  console.log('handleSubmit 执行，isLogin =', isLogin.value)

  if (isLogin.value) {
    onLogin()
  } else {
    onRegister()
  }
}
</script>

<style scoped>
/* 全局样式 */
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
}

/* 登录/注册表单 */
.auth-form {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 20px;
  padding: 40px 30px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

/* Logo和标题 */
.app-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}

.logo-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 15px;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.music-icon {
  font-size: 36px;
  color: white;
}

.app-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.app-slogan {
  font-size: 14px;
  color: #666;
}

/* 表单内容 */
.form-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 输入组 */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 0 15px;
  height: 50px;
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.input-icon {
  font-size: 18px;
  color: #999;
  margin-right: 10px;
}

.input-field {
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: #333;
}

.placeholder-text {
  color: #999;
}

/* 密码切换 */
.password-toggle {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-icon {
  font-size: 18px;
  color: #667eea;
}

/* 选项 */
.options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 5px;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox {
  transform: scale(1.2);
}

.remember-text {
  font-size: 14px;
  color: #666;
}

.forgot-password {
  font-size: 14px;
  color: #667eea;
  text-decoration: underline;
}

/* 登录/注册按钮 */
.auth-btn {
  width: 100%;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.auth-btn:active {
  transform: translateY(2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.auth-btn-text {
  font-size: 18px;
  font-weight: 600;
  color: white;
}



/* 切换登录/注册 */
.toggle-link {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
}

.toggle-text {
  font-size: 14px;
  color: #666;
}

.toggle-btn {
  font-size: 14px;
  color: #667eea;
  font-weight: 600;
  text-decoration: underline;
}

/* 响应式调整 */
@media (max-width: 375px) {
  .auth-form {
    padding: 30px 20px;
  }
  
  .app-title {
    font-size: 22px;
  }
  
  .auth-btn-text {
    font-size: 16px;
  }
}
</style>