import { defineConfig, loadEnv, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig(({ command, mode }): UserConfig => {
  return {
    resolve: {
      alias: {
        '@': '/src/'
      }
    },
    plugins: [vue()]
  }
})
