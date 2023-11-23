I'm using basic Vite app, so in order to run it locally, just do:

```bash
npm install
npm run dev
```

JWT token is hardcoded in utils, I'm using one I got from website after signing with my metamask wallet, it says that my api keys are valid for 90 days, so I haven't bothered with env variables. But in real project there ofc would be a combo of auth for users or some env variables in local dev, the usual stuff.

I really liked this exercise, it made me feel alive for the first time in a long time. Most of the modern frontend is very boring and kinda moving backwards with heavy focus on SSR, even after initial render. So working on a widget with very fast api and updates where you need to care about code effiency was really fun, I'm totally in love.

The most challenging part turned out to be battling double useEffect call in dev-react StrictMode, but once I figured out how to properly cleanup and reset subscriptions and connection, everything after that was very smooth.

I used refs for majority data-related things, since they aren't causing re-renders (which can be very helpful if I'm updating orders in memory that are outside of top/bottom 10 display values), and state was used only for displayed orders + offline message.

Regarding memory restrictions, I went with approach of having a variable for maximum number of displayed orders, plus buffer multiplier for how many orders to keep in local memory. So if maxDisplay is 10 and bufferMultipler is 4, then I'm keeping up to 40 orders, rest are being culled. Orders are maintaining their sorted order by price, so if 41th order arrived that is outside of 40 range, it will be culled. Using this system means that there can be a case where I had 40 orders, received 20 more, which were culled, then 35 orders were nullified, and now I'm basically sitting with 5 orders in my memory, while in reality there are actually 20 more orders somewhere there. In this case I have a logic that if number of orders in memory drops below maxDisplay, then I'm restarting the connection and replenishing the initial state. So assumption here is that after replenish I'll get at least 10 and things will be fine. Obviously there can be a case where you have less orders than 10, and then my code will end up in an endless loop of restarts. But I decided to not address this case in this exercise, since it requires a proper discussion with product and backend in order to understand how often something like this can happen and how to work with it (easiest band-aid is to make maxDisplay dynamic based on initial number of received orders, but even this requires some fine-tuning).

Also I could implement latest trade (saw it in api, looks straightforward), but at this point I need to ship it, because I got other interviews and test-exercises in pipeline which I need to finish before my tomorrow's flight.