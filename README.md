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

Example loss entry:

```json
{
  "date": "2026-06-08",
  "result": "loss",
  "relapseTimestamp": "2026-06-08T21:12:00+07:00",
  "refusals": []
}
```

Example refusal entry:

```json
{
  "date": "2026-06-09",
  "result": "win",
  "relapseTimestamp": null,
  "refusals": ["2026-06-09T20:44:00+07:00"]
}
```
