# NoArousal

NoArousal is a public PMO-free streak and education site built with Astro. It publishes the journey start from June 6, 2026 at 12:00 PM Asia/Jakarta, the current streak, and a public win rate from the accountability log.

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
```

## Accountability Log

Edit `src/data/accountability.json` when a public accountability event should be recorded. Every Asia/Jakarta calendar day since the journey start counts as a win unless that date is marked as a loss.

The hidden CMS is available at `/data/`. It is not linked from the public navigation.

## Blog Posts

Blog articles live in `src/content/blog` as Markdown files using Astro Content Collections. The `/data/` CMS can create and edit these files.

Example loss entry:

```json
{
  "type": "relapse",
  "timestamp": "2026-06-08T21:12:00+07:00"
}
```

Example refusal entry:

```json
{
  "type": "refuse",
  "timestamp": "2026-06-09T20:44:00+07:00"
}
```
