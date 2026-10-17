# Analytics read-back and next-slate loop

Code: `src/lib/analytics/`. Tests use synthetic numbers (no real channel data was reachable from the cloud session).

- `reader.ts` asks YouTube which channel the credentials act as and aborts unless it is exactly `UCyq4s4Nei7Q26tu7EIQY7xw` (HB-10 on the read path), then pulls per-video views, minutes watched, average view duration, average view percentage and subscribers gained. The caller passes `getAccessToken`; this code never performs or stores OAuth. First real run is local, once the channel-scoped read scope exists.
- `rank.ts` scores each video by percentile of minutes watched per view, retention and subscribers per 1,000 views, rolls scores up by source and theme (views-weighted), and ranks queued candidates. Groups under 100 views are flagged low confidence and pulled toward neutral; unseen groups score a neutral 0.5 so new ideas are not buried.
- Output is a `SlateProposal` with `proposal: true`, `decidedBy: 'jonathan'`. Weights (0.5 / 0.4 / 0.1) and the 100-view floor are starting proposals, not decisions (HB-4).

Local use: read metrics with `readChannelMetrics({startDate, endDate}, {getAccessToken})`, join to `VideoTag`s from the batch recipes, call `proposeNextSlate`, and review the result.
