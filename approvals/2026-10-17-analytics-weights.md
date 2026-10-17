# Approve the starting scoring weights for the next-slate ranking
status: WAITING_ON_JON
red: second-look
project: What Am I Appreciating Now
one_click: approve analytics weights
The analytics loop ranks what to make next from watch time per view (0.5), retention (0.4) and subscribers per 1,000 views (0.1), and ignores groups under 100 views. These are content-shape and KPI choices, so they are yours (HB-4). Built so far: the channel-checked reader, the ranking, and tests on invented numbers; nothing has touched real channel data or OAuth. On yes, the weights stay as the defaults for the first local run and get retuned from real numbers. On no, tell me different weights or a different metric and I change two constants. Nothing publishes either way.
