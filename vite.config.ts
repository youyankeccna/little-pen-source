import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  server: {
    proxy: {
      '/api': {
        target: process.env.LITTLE_PEN_SERVER || 'http://127.0.0.1:5178',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (outgoing, incoming) => {
            const origin = incoming.headers.origin
            if (origin && new URL(origin).host === incoming.headers.host) {
              outgoing.setHeader('Origin', process.env.LITTLE_PEN_SERVER || 'http://127.0.0.1:5178')
            }
          })
        }
      }
    }
  },
});
