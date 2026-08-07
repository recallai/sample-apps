import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const project_root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
    const api_port = loadEnv(mode, project_root, "").PORT || "4000";
    const api_proxy = {
        "/api": {
            target: `http://localhost:${api_port}`,
            changeOrigin: true,
        },
    };

    return {
        plugins: [react(), tailwindcss()],
        root: path.resolve(project_root, "src/client"),
        build: {
            outDir: path.resolve(project_root, "dist/client"),
            emptyOutDir: true,
        },
        server: {
            port: 5173,
            allowedHosts: true,
            proxy: api_proxy,
        },
        preview: {
            port: 5173,
            allowedHosts: true,
            proxy: api_proxy,
        },
    };
});
