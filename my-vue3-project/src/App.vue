<!-- 
应用根组件
功能：作为整个应用的入口组件，包含全局布局和生命周期管理
--> 
<script>
export default {
  /**
   * 应用启动时执行
   * 功能：初始化应用，加载必要资源
   */
  onLaunch: function () {
    console.log('App Launch')
  },
  
  /**
   * 应用显示时执行
   * 功能：处理应用从后台进入前台的逻辑
   */
  onShow: function () {
    console.log('App Show')
  },
  
  /**
   * 应用隐藏时执行
   * 功能：处理应用从前台进入后台的逻辑
   */
  onHide: function () {
    console.log('App Hide')
  },
}
</script>

<style>
/* 全局公共样式 */
/* 作用：为所有页面提供基础样式支持 */

/* 手机优先：宽屏仅显示居中的手机宽度，真实手机占满可用宽度。 */
page { box-sizing: border-box; }
uni-page-body { width: 100%; max-width: 430px; margin: 0 auto; }
@media (min-width: 431px) {
  html, body { background: #202330; }
  uni-page-head .uni-page-head {
    width: 430px; left: 50%; right: auto; transform: translateX(-50%);
    box-sizing: border-box;
  }
}

</style>
