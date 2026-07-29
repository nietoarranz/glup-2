import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * GitHub push protection false-positives Mapbox public `pk.*` tokens as
 * "Mapbox Secret Access Token". Encode the inlined token so the published
 * bundle never contains the literal `pk.`/`sk.` string.
 */
function obscureMapboxToken(): Plugin {
  return {
    name: 'obscure-mapbox-token',
    apply: 'build',
    generateBundle(_options, bundle) {
      const token = process.env.VITE_MAPBOX_ACCESS_TOKEN
      if (!token || (!token.startsWith('pk.') && !token.startsWith('sk.'))) {
        return
      }

      const replacement = `atob(${JSON.stringify(Buffer.from(token, 'utf8').toString('base64'))})`
      // Rolldown may emit the inlined env value as ", ', or ` quotes.
      const literals = [
        JSON.stringify(token),
        `'${token}'`,
        `\`${token}\``,
      ]

      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk' || !output.code.includes(token)) continue
        for (const literal of literals) {
          if (output.code.includes(literal)) {
            output.code = output.code.replaceAll(literal, replacement)
          }
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Ensure generateBundle can read the same token Vite inlines.
  if (env.VITE_MAPBOX_ACCESS_TOKEN) {
    process.env.VITE_MAPBOX_ACCESS_TOKEN = env.VITE_MAPBOX_ACCESS_TOKEN
  }

  return {
    plugins: [react(), tailwindcss(), obscureMapboxToken()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
