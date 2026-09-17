import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative assets work both locally and under a GitHub Pages repository path.
export default defineConfig({ plugins: [react()], base: './' })
