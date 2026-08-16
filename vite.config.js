import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import manifest from './src/manifest';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    return {
        build: {
            emptyOutDir: true,
            outDir: 'build',
            rollupOptions: {
                output: {
                    chunkFileNames: 'assets/chunk-[hash].js',
                },
            },
        },
        plugins: [crx({ manifest: manifest }), react()],
        legacy: {
            skipWebSocketTokenCheck: true,
        },
    };
});
