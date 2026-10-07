This is NOT Roblox and has no affiliation or code from Roblox

This project was inspired and pulled from https://shedletsky.com/SFOTH/ 

There is no intention to monetize this, steal this, or sell this. It will remain FOSS and be runnable via a browser.

Programming (and creating maps)

Creating maps seems possible currently but currently there is no clear view on how scripting will be integrated into this project (It is a major priority so games can run smoothly.) Currently I don't have a domain or VPS so I don't have a way to publicly run this but I will get there eventually.

For now host locally and port forward or use ngrok or hamachi (playit.gg locked tcp hosting behind a paywall.)

Host cmd example:

pkill -f "node index.js"; sleep 1; PORT=80 sudo node index.js
