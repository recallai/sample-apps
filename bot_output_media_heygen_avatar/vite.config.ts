import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    root: path.resolve(__dirname, 'src/client'),
    publicDir: path.resolve(__dirname, 'src/client/public'),
    build: {
        outDir: path.resolve(__dirname, 'dist/client'),
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        allowedHosts: true, // Allow ngrok and other tunneling services
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
});
