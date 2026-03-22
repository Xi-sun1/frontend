/**
 * 应用入口文件
 * 功能：创建和初始化Vue应用实例，配置状态管理
 */
import { createSSRApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";

/**
 * 创建Vue应用实例
 * @returns {Object} 包含app实例的对象
 * 功能：初始化Vue应用，配置Pinia状态管理
 */
export function createApp() {
  // 创建SSR应用实例
  const app = createSSRApp(App);

  /**
   * 创建Pinia实例
   * 作用：实现应用状态的集中管理
   */
  const pinia = createPinia();

  /**
   * 注册Pinia到应用
   * 作用：使所有组件可以访问Pinia状态管理
   */
  app.use(pinia);

  return {
    app,
  };
}
