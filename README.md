# Weather App

A weather app with live city search, geolocation, current conditions, and a 5-day forecast — no API key required.

**Live:** https://weather-app-orcin-one.vercel.app
**GitHub:** https://github.com/8fn4wf8phr-ops/weather-app

## Features

- Search any city, with live autocomplete suggestions as you type
- "Use my location" button (browser geolocation)
- Current conditions: temperature, condition, feels-like, humidity, wind, and today's high/low
- 5-day forecast strip
- °F / °C unit toggle — recalculates instantly, no extra API call
- Recent searches saved locally, so your last city loads automatically next time
- No signup, no API key — powered by [Open-Meteo](https://open-meteo.com/), a free weather and geocoding API

## Tech Stack

- HTML5
- CSS3 (custom properties for theming, no framework)
- Vanilla JavaScript — `fetch`, async/await, the Geolocation API
- Deployed on Vercel

## Getting Started

No build step required. Open `index.html` directly in a browser, or serve the folder locally:

```
python3 -m http.server 8082
```

Then visit `http://localhost:8082`.

## Project Structure

```
weather-app/
├── index.html
├── css/
│   └── style.css
└── js/
    └── script.js
```

## Related Projects

- [Tic-Tac-Toe (React)](https://github.com/8fn4wf8phr-ops/tic-tac-toe-react) — [live demo](https://tic-tac-toe-react-sand-ten.vercel.app/)
- [Calculator](https://github.com/8fn4wf8phr-ops/calculator-app) — [live demo](https://calculator-app-three-sand.vercel.app/)
- [Portfolio site](https://github.com/8fn4wf8phr-ops/my-website) — [live site](https://my-website-murex-six-54.vercel.app/)
