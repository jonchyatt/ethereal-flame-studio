# Analytics read-back and next-slate loop

Code: `src/lib/analytics/`. Tests use synthetic numbers (no real channel data was reachable from the cloud session).

- `reader.ts` asks YouTube which channel the credentials act as and aborts unless it is exactly `UCyq4s4Nei7Q26tu7EIQY7xw` (HB-10 on the read path), then pulls per-video views, minutes watched, average view duration, average view percentage and subscribers gained. The caller passes `getAccessToken`; this code never performs or stores OAuth. First real run is local, once the channel-scoped read scope exists.
- `rank.ts` scores each video by percentile of minutes watched per view, retention and subscribers per 1,000 views, rolls scores up by source and theme (views-weighted), and ranks queued candidates. Groups under 100 views are flagged low confidence and pulled toward neutral; unseen groups score a neutral 0.5 so new ideas are not buried.
- Output is a `SlateProposal` with `proposal: true`, `decidedBy: 'jonathan'`. Weights are equal thirds because no source publishes numbers (see below); the 100-view floor is a sample-size guard.

## Where each metric comes from (checked 2026-10-19)

Machine-readable copy: `src/lib/analytics/sources.ts`.

| Metric in the score | Grounded in |
|---|---|
| Minutes watched per view | [YouTube Help, audience retention](https://support.google.com/youtube/answer/9314415): watch time and average view duration are the reported measures; Shane Hummus's [guide](https://shanehummus.com/youtube-growth/the-low-tech-guide-to-youtube-success-2025-edition/) treats watch time as following from retention |
| Average view percentage (retention) | Same two pages: YouTube's retention report; Hummus's retention-first method (value in the first 30 seconds, "70% better retention") |
| Subscribers gained per 1,000 views | Hummus's guide (subscriber growth as an outcome of consistency); [YouTube Help, recommendations](https://support.google.com/youtube/answer/9962575) (satisfaction counts, not watch time alone) |

**Not grounded, named on purpose:** the relative weights (no reachable source gives numbers; YouTube's page gives none), the 100-view floor, and views-weighting inside a group. **Kallaway and Earn With Content:** their material could not be retrieved from the cloud session, and the doctrine files Jonathan listed (`data/content/doctrine/*.md`, `CANDIDATE-PILE.md`) are not on the jarvis default branch, so nothing here is attributed to them. When those files are reachable, they can replace the equal weights with their stated ones in one constant.

Local use: read metrics with `readChannelMetrics({startDate, endDate}, {getAccessToken})`, join to `VideoTag`s from the batch recipes, call `proposeNextSlate`, and review the result.
