# glup-2

React + Vite app with Mapbox GL JS.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add your Mapbox token:

```bash
cp .env.example .env
```

Edit `.env` and set `VITE_MAPBOX_ACCESS_TOKEN` to a public token (`pk.…`) from [Mapbox Access Tokens](https://account.mapbox.com/access-tokens/).

3. Start the dev server:

```bash
npm run dev
```

## Scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start Vite dev server                            |
| `npm run build`   | Typecheck and production build                   |
| `npm run preview` | Preview production build                         |
| `npm run lint`    | Run oxlint                                       |
| `npm run deploy`  | Build and publish `dist` to the `gh-pages` branch |

## GitHub Pages (custom domain)

The site deploys to the `gh-pages` branch and is meant to be served at [https://glup.nietoarranz.com](https://glup.nietoarranz.com). Vite’s default `base` is `/` (not a project subpath), so asset URLs work on the custom domain root. `public/CNAME` is copied into `dist` on build.

### Manual setup (once)

1. **DNS** (on `nietoarranz.com`): add a CNAME record `glup` → `nietoarranz.github.io`.
2. **GitHub → Settings → Pages**: source = `gh-pages` / root; custom domain = `glup.nietoarranz.com`; enable HTTPS after DNS verifies.

### Publish updates

```bash
npm run deploy
```

This runs `build`, writes `dist/.nojekyll`, and publishes `dist` (including CNAME and dotfiles) to `gh-pages`.

## Map component

The map lives in `src/components/Map.tsx`. It initializes Mapbox on mount, adds navigation controls, and cleans up on unmount. Default view is Madrid; change `center`, `zoom`, or `style` there.
