import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 'base' configures the path for assets. 
  // './' ensures assets are loaded relatively, working for both custom domains and project pages.
  base: './', 
})