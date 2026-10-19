# Switch the www homepage to the front door
status: WAITING_ON_JON
red: second-look
project: What Am I Appreciating Now
one_click: front door on
www.whatamiappreciatingnow.com still shows the flame visualizer, so /store and episode links do not land on the store there. Built: the front door and store now also serve on www behind the setting WAIA_WWW_FRONT_DOOR, which is off today. Look at it privately at www.whatamiappreciatingnow.com/preview/front-door (not indexed). Setting it is a Vercel change, which stays yours. On "front door on" you set WAIA_WWW_FRONT_DOOR=on in Vercel and redeploy, and www shows the front door and /store. On no, www keeps the visualizer and nothing changes.
