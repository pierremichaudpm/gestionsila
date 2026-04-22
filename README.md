# Gestion SILA

Plateforme de gestion de coproduction. Première instance : SILA — Héroïnes Arctiques.

Voir [`CLAUDE.md`](./CLAUDE.md) pour le contexte produit, le modèle de données et l'architecture UX.

## Démarrage

```bash
npm install
cp .env.example .env.local  # puis renseigner les clés Supabase
npm run dev
```

## Scripts

- `npm run dev` — serveur Vite sur http://localhost:5173
- `npm run build` — build de production dans `dist/`
- `npm run preview` — prévisualisation du build
- `npm run lint` — ESLint

## Stack

React 19 · Vite 6 · Tailwind CSS v4 · React Router 7 · Supabase · Netlify
