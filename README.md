# Gym Tracker

A mobile-first workout tracker that runs entirely in your browser. Log sets, get instant feedback when you hit a **personal record**, see what every session trained on a body map, and follow your progress – including body weight and progress photos. No account, no backend, no tracking: your data stays on your device.

> UI language: English · Unit: kg

<!-- Replace the placeholders with real screenshots (e.g. docs/screenshots/*.png) -->
| Train | History | Progress |
|---|---|---|
| ![Train screenshot placeholder](docs/screenshots/train.png) | ![History screenshot placeholder](docs/screenshots/history.png) | ![Progress screenshot placeholder](docs/screenshots/progress.png) |

## Features

**Log workouts**
- Start a session with today's date (changeable), add exercises from a searchable list filtered by body part
- ~55 classic exercises with primary/secondary muscle group and equipment; add, edit and delete your own
- **Every session gets a name** from what you train, e.g. *Arms · Chest · Shoulders* (rename it any time), plus a **body map** (front and back) with the targeted muscles, the list of body regions and quick stats
- 3 empty set rows per exercise, `Add set` for more, delete single sets; empty sets are ignored on save
- Big, tappable number fields; weight is optional for bodyweight exercises
- "Last time" hint under every exercise (e.g. `8 / 8 / 7 × 60 kg`)
- An unsaved workout survives page reloads

**Personal records**
- Heaviest weight · most reps at the same or a higher weight · estimated 1RM (Epley) · most reps for bodyweight exercises
- Instant toast + 🏆 badge on the set; the badge stays visible in the history
- Current PRs are always shown per exercise
- PRs are *derived* from the history by pure functions, so editing or deleting an old workout always recalculates them correctly
- Equal values are not a PR; empty/incomplete sets are ignored

**Progress** (4 weeks / 3 months / 1 year / all)
- Workouts per week, weekly streak, most-trained exercises, sets per muscle group
- Strength progress per exercise (top weight + estimated 1RM, PRs marked)
- **Body weight**: log it now and then, see the latest value, the change and a trend chart
- **Progress photos**: add photos (camera or library) to a day and swipe through all of them in one gallery
- All current PRs and the latest ones
- Insights: total volume and trend, neglected body regions, push/pull balance, favourite weekday

**Data & misc**
- JSON export/import of everything (optionally including photos) – backup and moving to a new phone
- Demo data, dark (default) / light / system theme
- Installable PWA, works offline

## Tech stack

React · TypeScript · Vite · Tailwind CSS · Dexie.js (IndexedDB) · Recharts · react-body-highlighter · vite-plugin-pwa · Vitest

## Local development

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (PR logic, sessions, stats, backup, …)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

Open the dev server on your phone (same Wi-Fi) with `npm run dev -- --host`. Note: the service worker / install prompt only work over HTTPS (or `localhost`).

## Project structure

```
src/
  lib/         Pure, unit-tested logic: pr.ts (PRs), session.ts (names & targets), stats.ts, insights.ts, backup.ts, …
  db/          Dexie schema, data actions, data provider
  components/  UI pieces (exercise card, body map, session summary, cards for body weight / photos, …)
  pages/       Train, History, Progress (dashboard), Exercises, Settings
```

## Deployment (GitHub Pages)

1. Create a **public** repository on GitHub and push this project to the `main` branch.
2. In the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): install → test → build → deploy.

The workflow sets `BASE_PATH=/<repo-name>/` so assets load correctly under `https://<user>.github.io/<repo-name>/`. The app uses hash routing (`/#/history`), so reloads on any page work on GitHub Pages.

To build manually for a project page: `BASE_PATH=/your-repo-name/ npm run build`.

## Use it on your phone

Open the deployed URL in Safari (iPhone) or Chrome (Android) → **Share → Add to Home Screen** / **Install app**. It then starts like a native app and works offline.

Your data – including photos – lives in the browser's IndexedDB **on that device**. Use **Settings → Export** regularly to keep a backup; the app reminds you after 30 days. On iPhone, Safari can clear data of websites you haven't opened for a long time; the installed home-screen app is exempt.

## Credits

- Body map: [`react-body-highlighter`](https://github.com/GV79/react-body-highlighter) (MIT), whose polygons come from [`react-native-body-highlighter`](https://github.com/HichamELBSI/react-native-body-highlighter) (MIT).

## License

[MIT](LICENSE)
