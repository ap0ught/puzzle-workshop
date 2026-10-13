import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
const isVercelBuild = (globalThis as any).process?.env?.VERCEL === '1';
export default defineConfig({plugins:[react()],base:'./',define:{'import.meta.env.VITE_VERCEL_ANALYTICS':JSON.stringify(isVercelBuild)},build:{outDir:'docs',emptyOutDir:true}});
