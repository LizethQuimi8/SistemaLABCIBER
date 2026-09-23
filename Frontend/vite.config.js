import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el sitio en https://<usuario>.github.io/SistemaLABCIBER/,
// no en la raiz del dominio: sin 'base' los assets (JS/CSS) se piden en la
// raiz y el sitio publicado queda en blanco/404. Ese 'base' solo debe
// aplicarse al build de produccion: en 'dev' rompe localhost (el server
// solo serviria bajo /SistemaLABCIBER/ en vez de la raiz).
// Puerto fijo (5180): el contenedor Docker 'frontend' ya ocupa el 5173, y si
// Vite salta a un puerto distinto en cada arranque, deja de coincidir con el
// origen permitido por CORS en el api-gateway (ver FRONTEND_ORIGIN).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/SistemaLABCIBER/' : '/',
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
  },
}))
