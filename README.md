# Timebox — Watch Later, actually later

A full-stack prototype for the “Time-Boxed Watch Later” product improvement concept. It helps people choose saved videos that fit a short free-time window, instead of endlessly scrolling through a long Watch Later list.

## Features

- **Time-based combo builder:** choose 10, 15, 20, 30 minutes, or enter a custom duration.
- **Mood filters:** Learn, Chill, Music, or Any.
- **Shuffle:** request a different combination.
- **Maybe later:** park videos you're not in the mood for, then restore them whenever.
- **Add videos:** manually add a title, channel, duration, mood, and optional YouTube URL.
- **YouTube Data API lookup (optional):** when configured, look up a public video's title, channel, and duration from a URL.
- **Persistent data:** Express API saves the queue to `data/videos.json`.
- Responsive UI with sample data and a simple visual design.

## Requirements

- Node.js 18 or newer
- npm

## Run locally

1. Extract the ZIP.
2. Open a terminal in the extracted `timeboxed-watch-later` folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open [http://localhost:3000](http://localhost:3000).

The app works immediately with its 20 seeded demo videos. On first start, it creates `data/videos.json`. This file is the demo database and is intentionally ignored by Git only if you choose to add that rule yourself.

## Optional YouTube API setup

The official YouTube Data API does **not** expose a user's private Watch Later playlist through the standard playlist endpoints. For that reason, this prototype uses a local demo queue rather than pretending it can automatically read a real account's Watch Later list.

You can still use the API to fetch metadata for a public video that you add:

1. Create a YouTube Data API v3 key in Google Cloud Console.
2. Copy `.env.example` to `.env`.
3. Set `YOUTUBE_API_KEY=your_key_here`.
4. Load environment variables when starting the server. The easiest option is to install `dotenv` (`npm install dotenv`) and add `require("dotenv").config();` as the first line of `server.js`, or set the environment variable directly in your shell before `npm start`.

Without a key, the lookup endpoint explains that manual entry is available. Manual adding still works.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Server health and API-key status |
| GET | `/api/videos?status=saved` | List saved videos |
| GET | `/api/videos?status=later` | List Maybe later videos |
| GET | `/api/videos?status=all` | List everything |
| POST | `/api/plan` | Build a time + mood-matched combo |
| POST | `/api/videos` | Add a video |
| PATCH | `/api/videos/:id` | Move between saved and Maybe later |
| DELETE | `/api/videos/:id` | Remove a video |
| POST | `/api/youtube/lookup` | Look up public video metadata via API key |

## How the combo algorithm works

The planner uses a bounded subset-sum dynamic-programming approach:

1. Convert the selected minutes to seconds.
2. Filter out videos parked in Maybe later and videos longer than the available time.
3. Apply the chosen mood filter.
4. Find a combination whose total duration is as close as possible to the target without going over it.
5. Return the videos, total duration, and remaining time is implicitly available as `availableSeconds - usedSeconds`.

For a target of 900 seconds and videos of 720, 540, and 180 seconds, the best exact combination might be 720 + 180 = 900 seconds. The algorithm never schedules the same video twice in a single plan.

## Project structure

```text
timeboxed-watch-later/
├── server.js
├── package.json
├── .env.example
├── README.md
├── data/
│   └── .gitkeep
└── public/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Notes for a project submission

- This is a working prototype, not an official YouTube feature.
- The demo queue and Maybe later state are stored on the server in a local JSON file. It is suitable for a local demo, not multi-user production use.
- For a production app, add user authentication, a real database, request validation/rate limits, tests, and OAuth-based account integration if an approved YouTube workflow becomes available.
- The supplied demo video IDs are illustrative. Some external videos may be unavailable or may not correspond exactly to the mock titles.
