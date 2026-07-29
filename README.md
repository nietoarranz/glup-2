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

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start Vite dev server    |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run lint`  | Run oxlint               |

## Map component

The map lives in `src/components/Map.tsx`. It initializes Mapbox on mount, adds navigation controls, and cleans up on unmount. Default view is Madrid; change `center`, `zoom`, or `style` there.
