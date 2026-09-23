import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve el sitio en https://<usuario>.github.io/SistemaLABCIBER/,
// no en la raiz del dominio: sin 'base' los assets (JS/CSS) se piden en la
// raiz y el sitio publicado queda en blanco/404. Ese 'base' solo debe
// aplicarse al build de produccion: en 'dev' rompe localhost (el server
// solo serviria bajo /SistemaLABCIBER/ en vez de la raiz).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/SistemaLABCIBER/' : '/',
  plugins: [react()],
}))
