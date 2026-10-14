import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el sitio en https://<usuario>.github.io/SistemaLABCIBER/,
// no en la raiz del dominio: sin 'base' los assets (JS/CSS) se piden en la
// raiz y el sitio publicado queda en blanco/404. Ese 'base' solo debe
// aplicarse al build para GitHub Pages (VITE_GH_PAGES=true, seteado en
// .github/workflows/deploy-pages.yml) - cualquier otro build de produccion
// (la imagen Docker del contenedor 'frontend', que se sirve desde la raiz
// de su propio dominio/IP) debe usar '/', o los JS/CSS se piden en una
// subcarpeta que no existe ahi y el sitio queda en blanco.
// Puerto fijo (5180): el contenedor Docker 'frontend' ya ocupa el 5173, y si
// Vite salta a un puerto distinto en cada arranque, deja de coincidir con el
// origen permitido por CORS en el api-gateway (ver FRONTEND_ORIGIN).
export default defineConfig(({ command }) => ({
  base: command === 'build' && process.env.VITE_GH_PAGES === 'true' ? '/SistemaLABCIBER/' : '/',
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
  },
}))
