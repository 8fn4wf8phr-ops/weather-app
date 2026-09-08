# Build Journey: Weather App

A look at how the weather app came together, step by step.

## 1. Picking the project

After finishing the portfolio site, Tic-Tac-Toe, and the Calculator, the next project was a chance to learn something new: none of the earlier apps talked to an external API — everything ran entirely in the browser. A weather app was a natural next step, since it's a small, contained way to practice `fetch` and working with real data from the internet.

## 2. Choosing an API

[Open-Meteo](https://open-meteo.com/) turned out to be the right fit: it's a free weather and geocoding API that needs no signup and no API key, which meant no secrets to manage and nothing to expose in client-side code. Two endpoints do all the work — one turns a city name into coordinates (geocoding), and the other turns coordinates into a forecast.

## 3. Building the core flow

The basic flow: type a city, search it, get back a list of matches, pick one, then fetch the forecast for its coordinates. Suggestions appear live as you type (debounced so it isn't firing a request on every keystroke), and picking a result — or just hitting Search — loads the current conditions and a 5-day forecast.

## 4. Adding location and units

A "use my location" button uses the browser's Geolocation API to skip the search step entirely. A °F/°C toggle switches units instantly without a second network request — the app always fetches in Celsius and converts on the fly, so switching units is just re-rendering with different math.

## 5. Recent searches

Like the calculator's history, recent searches save to `localStorage` as a small list of chips under the search bar, and the most recent one loads automatically the next time the page opens — so the app is never just an empty search box.

## 6. Deploying and documenting

Pushed to GitHub and deployed on Vercel using the same "Other" framework preset as the other static projects — no build step needed. Then added to the portfolio's Projects section, and wrote this README and journey file to match the documentation style used across the other builds.

## What's next

A few ideas for later:

- Hourly forecast, not just daily
- Weather-based background/theme (sunny, rainy, snowy)
- A small map showing the searched location
- Severe weather alerts, if Open-Meteo exposes them
