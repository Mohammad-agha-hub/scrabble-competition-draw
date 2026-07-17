# Draw Day — Tournament Grouping

A Next.js app that stores students (name, class, section) in MongoDB and draws
balanced random groups for a tournament. You add the classes, sections and
students; the app builds the pods. Remove students and re-draw any time — every
roster and draw is saved.

## Features

- **Add students** one at a time, or paste a whole class (one name per line).
- **MongoDB storage** — students and the latest draw persist across reloads.
- **Draw groups** of any size (default 4). Choose the scope:
  - Within each class + section (default)
  - Within each class
  - Across everyone
- **Smart leftovers** — never leaves a single lonely student; small remainders
  are spread across existing groups.
- **Search + filter** the roster, **remove** any student, then **re-draw**.
- **Print** a clean copy of the draw.
- shadcn/ui components, navy + gold tournament styling.

## Setup

You need [Node.js 18+](https://nodejs.org) and a MongoDB database.

### 1. Get a MongoDB connection string

**Option A — MongoDB Atlas (free, recommended):**
1. Create a free cluster at https://www.mongodb.com/atlas
2. Add a database user and allow your IP.
3. Copy the connection string (looks like `mongodb+srv://…`).

**Option B — Local MongoDB:** install MongoDB Community Server and use
`mongodb://localhost:27017`.

### 2. Configure the app

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste your connection string into `MONGODB_URI`.

### 3. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 4. Use it

1. On the **Roster** tab, add classes/sections/students (or paste a class).
2. Switch to **The Draw** tab, pick a group size and scope, and hit **Draw groups**.
3. Re-draw, clear, or print whenever you like.

## Where data lives

- `students` collection — every student `{ name, className, section, createdAt }`.
- `groupBatches` collection — the most recent draw (kept as a single document).

## Build for production

```bash
npm run build
npm start
```
