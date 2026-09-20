import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el sitio en https://<usuario>.github.io/SistemaLABCIBER/,
// no en la raiz del dominio: sin 'base' los assets (JS/CSS) se piden en la
// raiz y el sitio publicado queda en blanco/404.
export default defineConfig({
  base: '/SistemaLABCIBER/',
  plugins: [react()],
})
