# Pick the price ladder for patrons and programs
status: WAITING_ON_JON
red: second-look
project: What Am I Appreciating Now
one_click: price ladder A
The three options are on /store/prices/preview ("not yet on sale"): A is the $5/$10/$20/$35 patron ladder with $15/month hypnosis and a $49 Yale protocol, B is gentler ($3/$7/$12/$25, $9, $29), C is more generous ($7/$15/$30/$50, $25, $79). Prices are yours, and the program numbers are my guesses. Built: one config file (src/lib/prices/config.ts, all blank) that the store, programs and patron pages read. On your answer ("price ladder A", B, C, or your own numbers) I fill that file in; it stays "not yet on sale" and Stripe stays in test mode, since live money is red 1 and your click. On no, everything stays blank.
