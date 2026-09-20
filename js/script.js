// ======================================================================
// UNSPLASH ACCESS KEY (optional): paste yours between the quotes below.
//   1. Create a free account at https://unsplash.com/developers
//   2. Register an application and copy its "Access Key"
// Leave the placeholder as-is to skip Unsplash: City View then uses
// Wikipedia only. This is a public, browser-side key (never paste the
// Secret Key here), and the demo tier's 50 requests/hour is shared by
// everyone using the site.
// ======================================================================
const UNSPLASH_ACCESS_KEY = 'xlAEgLJQMyqoJTZrCGsP60qLMAA3yrxTDzu0VgE5h0w';

// ---- Weather code -> description/icon (WMO codes, used by Open-Meteo) ----
const WEATHER_CODES = {
  0: { desc: 'Clear sky', icon: '☀️', category: 'wx-sun' },
  1: { desc: 'Mainly clear', icon: '🌤️', category: 'wx-sun' },
  2: { desc: 'Partly cloudy', icon: '⛅', category: 'wx-cloud' },
  3: { desc: 'Overcast', icon: '☁️', category: 'wx-cloud' },
  45: { desc: 'Fog', icon: '🌫️', category: 'wx-fog' },
  48: { desc: 'Depositing rime fog', icon: '🌫️', category: 'wx-fog' },
  51: { desc: 'Light drizzle', icon: '🌦️', category: 'wx-rain' },
  53: { desc: 'Drizzle', icon: '🌦️', category: 'wx-rain' },
  55: { desc: 'Dense drizzle', icon: '🌦️', category: 'wx-rain' },
  56: { desc: 'Freezing drizzle', icon: '🌧️', category: 'wx-rain' },
  57: { desc: 'Dense freezing drizzle', icon: '🌧️', category: 'wx-rain' },
  61: { desc: 'Slight rain', icon: '🌧️', category: 'wx-rain' },
  63: { desc: 'Rain', icon: '🌧️', category: 'wx-rain' },
  65: { desc: 'Heavy rain', icon: '🌧️', category: 'wx-rain' },
  66: { desc: 'Freezing rain', icon: '🌧️', category: 'wx-rain' },
  67: { desc: 'Heavy freezing rain', icon: '🌧️', category: 'wx-rain' },
  71: { desc: 'Slight snow', icon: '❄️', category: 'wx-snow' },
  73: { desc: 'Snow', icon: '❄️', category: 'wx-snow' },
  75: { desc: 'Heavy snow', icon: '❄️', category: 'wx-snow' },
  77: { desc: 'Snow grains', icon: '❄️', category: 'wx-snow' },
  80: { desc: 'Slight rain showers', icon: '🌦️', category: 'wx-rain' },
  81: { desc: 'Rain showers', icon: '🌦️', category: 'wx-rain' },
  82: { desc: 'Violent rain showers', icon: '⛈️', category: 'wx-storm' },
  85: { desc: 'Slight snow showers', icon: '🌨️', category: 'wx-snow' },
  86: { desc: 'Heavy snow showers', icon: '🌨️', category: 'wx-snow' },
  95: { desc: 'Thunderstorm', icon: '⛈️', category: 'wx-storm' },
  96: { desc: 'Thunderstorm with hail', icon: '⛈️', category: 'wx-storm' },
  99: { desc: 'Severe thunderstorm with hail', icon: '⛈️', category: 'wx-storm' },
};

function weatherInfo(code) {
  return WEATHER_CODES[code] || { desc: 'Unknown', icon: '❔', category: '' };
}

// ---- State ----
let unit = localStorage.getItem('weatherUnit') || 'F'; // 'F' or 'C'
let lastResult = null; // raw Celsius data from the API, re-rendered on unit toggle
let theme = localStorage.getItem('weatherTheme')
  || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
let cityView = localStorage.getItem('weatherCityView') === 'on'; // off by default: no Wikipedia requests until opted in
let cityImageController = null; // aborts the in-flight photo lookup when the user moves on

// ---- Elements ----
const searchForm = document.getElementById('searchForm');
const citySearch = document.getElementById('citySearch');
const suggestionsEl = document.getElementById('suggestions');
const recentChipsEl = document.getElementById('recentChips');
const statusEl = document.getElementById('statusMessage');
const unitToggle = document.getElementById('unitToggle');
const themeToggle = document.getElementById('themeToggle');
const cityViewToggle = document.getElementById('cityViewToggle');
const cityBgEl = document.getElementById('cityBg');
const cityCreditEl = document.getElementById('cityCredit');
const locateBtn = document.getElementById('locateBtn');

const currentWeatherEl = document.getElementById('currentWeather');
const currentIconEl = document.getElementById('currentIcon');
const currentTempEl = document.getElementById('currentTemp');
const currentPlaceEl = document.getElementById('currentPlace');
const currentConditionEl = document.getElementById('currentCondition');
const currentFeelsEl = document.getElementById('currentFeels');
const statHumidityEl = document.getElementById('statHumidity');
const statWindEl = document.getElementById('statWind');
const statHighLowEl = document.getElementById('statHighLow');
const statUvEl = document.getElementById('statUv');
const statSunriseEl = document.getElementById('statSunrise');
const statSunsetEl = document.getElementById('statSunset');

const hourlyForecastEl = document.getElementById('hourlyForecast');
const hourlyScrollEl = document.getElementById('hourlyScroll');

const forecastEl = document.getElementById('forecast');
const forecastGridEl = document.getElementById('forecastGrid');

// ---- Helpers ----
function cToF(c) {
  return (c * 9) / 5 + 32;
}

function formatTemp(celsius) {
  const value = unit === 'F' ? cToF(celsius) : celsius;
  return `${Math.round(value)}°`;
}

function kmhToMph(kmh) {
  return kmh * 0.621371;
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.hidden = false;
  statusEl.classList.toggle('error', isError);
}

function hideStatus() {
  statusEl.hidden = true;
  statusEl.classList.remove('error');
}

function clearSuggestions() {
  suggestionsEl.hidden = true;
  suggestionsEl.innerHTML = '';
}

// ---- Recent searches (localStorage) ----
function getRecents() {
  try {
    return JSON.parse(localStorage.getItem('weatherRecents') || '[]');
  } catch {
    return [];
  }
}

function saveRecent(place) {
  let recents = getRecents().filter(r => r.label !== place.label);
  recents.unshift(place);
  recents = recents.slice(0, 5);
  localStorage.setItem('weatherRecents', JSON.stringify(recents));
  renderRecents();
}

function renderRecents() {
  const recents = getRecents();
  recentChipsEl.innerHTML = '';
  recents.forEach(place => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.type = 'button';
    chip.textContent = place.label;
    chip.addEventListener('click', () => loadWeather(place));
    recentChipsEl.appendChild(chip);
  });
}

// ---- Geocoding (Open-Meteo geocoding API, no key required) ----
async function searchCities(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return (data.results || []).map(r => ({
    label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    population: r.population,
    featureCode: r.feature_code, // 'PPLC' = national capital
    lat: r.latitude,
    lon: r.longitude,
  }));
}

function renderSuggestions(places) {
  if (!places.length) {
    clearSuggestions();
    return;
  }
  suggestionsEl.innerHTML = '';
  places.forEach(place => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = place.label;
    btn.addEventListener('click', () => {
      citySearch.value = place.label;
      clearSuggestions();
      loadWeather(place);
    });
    suggestionsEl.appendChild(btn);
  });
  suggestionsEl.hidden = false;
}

// ---- Weather fetch (Open-Meteo forecast API, no key required) ----
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: 5,
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather lookup failed');
  return res.json();
}

// ---- Render ----
function renderWeather(place, data) {
  lastResult = { place, data };

  const current = data.current;
  const info = weatherInfo(current.weather_code);

  currentIconEl.textContent = info.icon;
  currentIconEl.className = `current-icon ${info.category}`;
  currentTempEl.textContent = formatTemp(current.temperature_2m);
  currentPlaceEl.textContent = place.label;
  currentConditionEl.textContent = info.desc;
  currentFeelsEl.textContent = `Feels like ${formatTemp(current.apparent_temperature)}`;

  statHumidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  const wind = unit === 'F' ? kmhToMph(current.wind_speed_10m) : current.wind_speed_10m;
  statWindEl.textContent = `${Math.round(wind)} ${unit === 'F' ? 'mph' : 'km/h'}`;

  const todayHigh = data.daily.temperature_2m_max[0];
  const todayLow = data.daily.temperature_2m_min[0];
  statHighLowEl.textContent = `${formatTemp(todayHigh)} / ${formatTemp(todayLow)}`;

  const uvIndex = data.daily.uv_index_max?.[0];
  statUvEl.textContent = uvIndex != null ? Math.round(uvIndex) : '--';

  const timeFormat = { hour: 'numeric', minute: '2-digit' };
  const sunrise = data.daily.sunrise?.[0];
  const sunset = data.daily.sunset?.[0];
  statSunriseEl.textContent = sunrise ? new Date(sunrise).toLocaleTimeString(undefined, timeFormat) : '--:--';
  statSunsetEl.textContent = sunset ? new Date(sunset).toLocaleTimeString(undefined, timeFormat) : '--:--';

  currentWeatherEl.hidden = false;

  // Hourly strip: next 24 hours starting from the current hour
  if (data.hourly) {
    hourlyScrollEl.innerHTML = '';
    const nowIso = data.current.time;
    let startIdx = data.hourly.time.findIndex(t => t >= nowIso);
    if (startIdx === -1) startIdx = 0;
    const hours = data.hourly.time.slice(startIdx, startIdx + 24);
    hours.forEach((timeStr, offset) => {
      const idx = startIdx + offset;
      const hourInfo = weatherInfo(data.hourly.weather_code[idx]);
      const date = new Date(timeStr);
      const label = offset === 0 ? 'Now' : date.toLocaleTimeString(undefined, { hour: 'numeric' });

      const card = document.createElement('div');
      card.className = 'hourly-hour';
      card.innerHTML = `
        <div class="hour-time">${label}</div>
        <div class="hour-icon ${hourInfo.category}">${hourInfo.icon}</div>
        <div class="hour-temp">${formatTemp(data.hourly.temperature_2m[idx])}</div>
      `;
      hourlyScrollEl.appendChild(card);
    });
    hourlyForecastEl.hidden = hours.length === 0;
  }

  // Forecast strip
  forecastGridEl.innerHTML = '';
  const days = data.daily.time;
  days.forEach((dateStr, i) => {
    const dayInfo = weatherInfo(data.daily.weather_code[i]);
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = i === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' });

    const card = document.createElement('div');
    card.className = 'forecast-day';
    card.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-icon ${dayInfo.category}">${dayInfo.icon}</div>
      <div class="day-high">${formatTemp(data.daily.temperature_2m_max[i])}</div>
      <div class="day-low">${formatTemp(data.daily.temperature_2m_min[i])}</div>
    `;
    forecastGridEl.appendChild(card);
  });
  forecastEl.hidden = false;
}

// ---- City View: photo background (Unsplash if a key is set, else Wikipedia) ----
const CITY_IMAGE_CACHE_KEY = 'cityImageCache';
const MAX_MATCH_DISTANCE_KM = 100; // a Wikipedia page farther than this from the searched place is a different place

// Unsplash search is plain text with no location check, so it's only trusted first for big
// cities (plenty of correctly tagged photos). Smaller places try Wikipedia first, which
// verifies by coordinates, and use Unsplash only as a fallback. Places without a known
// population (e.g. recents saved by older versions) count as small.
const LARGE_CITY_POPULATION = 250000;

function isLargeCity(place) {
  return place.featureCode === 'PPLC' || (place.population ?? 0) >= LARGE_CITY_POPULATION;
}

function readCityImageCache() {
  try {
    return JSON.parse(localStorage.getItem(CITY_IMAGE_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function updateCityImageCache(key, value) {
  const cache = readCityImageCache();
  if (value) cache[key] = value;
  else delete cache[key];
  try {
    localStorage.setItem(CITY_IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable: the cache is only an optimization.
  }
}

// admin1 is part of the key so "Springfield, Illinois" and "Springfield, Massachusetts" don't collide.
function cityCacheKey(cityName, countryName, admin1) {
  return [cityName, admin1, countryName].filter(Boolean).join(',');
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function normalizeForMatch(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); // "Reykjavík" ~ "Reykjavik"
}

async function fetchWikiSummary(title, signal) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const res = await fetch(url, { signal });
  return res.ok ? res.json() : null; // 404 = no such page
}

// Turns a summary into { url, source, page }, or null if it's a disambiguation page,
// a page about somewhere else, or has no image.
function usableCityImage(summary, lat, lon) {
  if (!summary || summary.type === 'disambiguation') return null;

  // Summaries of geotagged pages carry coordinates: use them to reject namesakes.
  if (lat != null && lon != null) {
    const c = summary.coordinates;
    if (!c || distanceKm(lat, lon, c.lat, c.lon) > MAX_MATCH_DISTANCE_KM) return null;
  }

  const url = summary.originalimage?.source || summary.thumbnail?.source;
  if (!url) return null;
  return { url, source: 'wikipedia', page: summary.content_urls?.desktop?.page || null };
}

function unsplashConfigured() {
  return Boolean(UNSPLASH_ACCESS_KEY) && UNSPLASH_ACCESS_KEY !== 'YOUR_UNSPLASH_ACCESS_KEY';
}

// Returns { url, source: 'unsplash', photographer, photographerUrl } or null.
// Never throws. Rate limiting (403) is logged separately from a genuine no-match so
// it's clear during testing why the Wikipedia fallback kicked in.
async function getUnsplashCityImage(cityName, countryName, { signal } = {}) {
  if (!unsplashConfigured()) return null;

  const params = new URLSearchParams({
    query: [cityName, countryName, 'cityscape'].filter(Boolean).join(' '),
    per_page: '1',
    orientation: 'landscape',
  });
  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      signal,
    });
    if (res.status === 403) {
      console.warn('Unsplash: HTTP 403, most likely the hourly rate limit (demo tier: 50 requests/hour). Falling back to Wikipedia.');
      return null;
    }
    if (res.status === 401) {
      console.warn('Unsplash: HTTP 401, the Access Key was rejected. Check UNSPLASH_ACCESS_KEY. Falling back to Wikipedia.');
      return null;
    }
    if (!res.ok) {
      console.warn(`Unsplash: request failed with HTTP ${res.status}. Falling back to Wikipedia.`);
      return null;
    }

    const photo = (await res.json()).results?.[0];
    if (!photo?.urls?.regular) {
      console.info(`Unsplash: no match for "${cityName}". Falling back to Wikipedia.`);
      return null;
    }
    return {
      url: photo.urls.regular,
      source: 'unsplash',
      photographer: photo.user?.name,
      photographerUrl: photo.user?.links?.html,
    };
  } catch (err) {
    if (err.name !== 'AbortError') console.warn(`Unsplash: request failed (${err.message}). Falling back to Wikipedia.`);
    return null;
  }
}

// Entries cached before Unsplash support were { image, page }: treat them as Wikipedia.
function normalizeCachedImage(entry) {
  if (!entry) return null;
  if (entry.url) return entry;
  if (entry.image) return { url: entry.image, source: 'wikipedia', page: entry.page };
  return null;
}

// Returns { url, source, ... } or null. Never throws: a failed lookup just means no background.
// Order: persisted cache first, then the two sources (Unsplash first only when preferUnsplash,
// i.e. for large cities; otherwise Wikipedia first). The cache is checked first so a city
// that's already cached (even from an earlier session) never spends Unsplash quota.
async function getCityImage(cityName, countryName, { admin1, lat, lon, signal, preferUnsplash = false } = {}) {
  const key = cityCacheKey(cityName, countryName, admin1);
  const cached = normalizeCachedImage(readCityImageCache()[key]);
  if (cached) return cached;

  const fromUnsplash = () => getUnsplashCityImage(cityName, countryName, { signal });
  const fromWikipedia = () => getWikipediaCityImage(cityName, countryName, { admin1, lat, lon, signal });
  const [first, second] = preferUnsplash ? [fromUnsplash, fromWikipedia] : [fromWikipedia, fromUnsplash];

  const result = (await first()) || (signal?.aborted ? null : await second());
  if (result) updateCityImageCache(key, result);
  return result;
}

// Wikipedia lookup (no key required). Returns { url, source: 'wikipedia', page } or null.
async function getWikipediaCityImage(cityName, countryName, { admin1, lat, lon, signal } = {}) {
  try {
    // 1. Try the city name as the page title.
    let result = usableCityImage(await fetchWikiSummary(cityName, signal), lat, lon);

    // 2. Otherwise search, biased toward region + country, and take the first candidate that qualifies.
    if (!result) {
      const query = [cityName, admin1, countryName].filter(Boolean).join(' ');
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`;
      const res = await fetch(url, { signal });
      if (res.ok) {
        const data = await res.json();
        const wanted = normalizeForMatch(cityName);
        for (const hit of data.query?.search || []) {
          // Skip articles that merely mention the city (e.g. its university or sports team).
          if (!normalizeForMatch(hit.title).includes(wanted)) continue;
          result = usableCityImage(await fetchWikiSummary(hit.title, signal), lat, lon);
          if (result) break;
        }
      }
    }

    return result;
  } catch {
    return null;
  }
}

// Old recents were saved before places carried name/country, so fall back to parsing the label.
function cityPartsFor(place) {
  if (place.name) return { name: place.name, admin1: place.admin1, country: place.country };
  if (place.label === 'My Location') return null; // no city name to look up
  const parts = place.label.split(', ');
  return {
    name: parts[0],
    admin1: parts.length > 2 ? parts[1] : undefined,
    country: parts.length > 1 ? parts[parts.length - 1] : undefined,
  };
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

function fadeOutCityLayers(except) {
  [...cityBgEl.children].forEach((layer) => {
    if (layer === except) return;
    layer.classList.remove('visible');
    setTimeout(() => layer.remove(), 450); // after the 0.4s fade
  });
}

// Unsplash asks for UTM params on links back to them.
const UNSPLASH_UTM = 'utm_source=weather_app&utm_medium=referral';

function creditLink(href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

function isHttps(url) {
  return typeof url === 'string' && url.startsWith('https://');
}

function renderCityCredit(photo) {
  cityCreditEl.replaceChildren();
  if (photo.source === 'unsplash') {
    const unsplashLink = creditLink(`https://unsplash.com/?${UNSPLASH_UTM}`, 'Unsplash');
    if (photo.photographer && isHttps(photo.photographerUrl)) {
      const profile = photo.photographerUrl + (photo.photographerUrl.includes('?') ? '&' : '?') + UNSPLASH_UTM;
      cityCreditEl.append('Photo by ', creditLink(profile, photo.photographer), ' on ', unsplashLink);
    } else {
      cityCreditEl.append('Photo on ', unsplashLink);
    }
  } else if (isHttps(photo.page)) {
    cityCreditEl.append(creditLink(photo.page, 'Photo via Wikipedia'));
  } else {
    cityCreditEl.hidden = true;
    return;
  }
  cityCreditEl.hidden = false;
}

function showCityBackground(photo) {
  const layer = document.createElement('div');
  layer.className = 'city-bg-layer';
  layer.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${JSON.stringify(photo.url)})`;
  cityBgEl.appendChild(layer);
  void layer.offsetWidth; // commit opacity:0 first so adding .visible animates instead of popping
  layer.classList.add('visible');
  fadeOutCityLayers(layer);

  document.body.classList.add('has-city-bg');
  renderCityCredit(photo);
}

function clearCityBackground() {
  fadeOutCityLayers(null);
  document.body.classList.remove('has-city-bg');
  cityCreditEl.hidden = true;
  cityCreditEl.replaceChildren();
}

// Pass null to clear. Makes no network requests while City View is off.
async function updateCityView(place) {
  if (cityImageController) cityImageController.abort(); // drop a stale lookup from a previous city
  const parts = cityView && place ? cityPartsFor(place) : null;
  if (!parts) {
    clearCityBackground();
    return;
  }

  const controller = new AbortController();
  cityImageController = controller;
  const result = await getCityImage(parts.name, parts.country, {
    admin1: parts.admin1,
    lat: place.lat,
    lon: place.lon,
    signal: controller.signal,
    preferUnsplash: isLargeCity(place),
  });
  if (controller.signal.aborted) return;

  if (result && await preloadImage(result.url)) {
    if (!controller.signal.aborted) showCityBackground(result);
  } else if (!controller.signal.aborted) {
    if (result) updateCityImageCache(cityCacheKey(parts.name, parts.country, parts.admin1), null); // dead URL
    clearCityBackground();
  }
}

// ---- Main flow ----
async function loadWeather(place) {
  clearSuggestions();
  hideStatus();
  showStatus(`Loading weather for ${place.label}…`);
  try {
    const data = await fetchWeather(place.lat, place.lon);
    hideStatus();
    renderWeather(place, data);
    saveRecent(place);
    updateCityView(place);
  } catch (err) {
    showStatus("Couldn't load weather for that location. Please try again.", true);
    currentWeatherEl.hidden = true;
    hourlyForecastEl.hidden = true;
    forecastEl.hidden = true;
    lastResult = null;
    updateCityView(null);
  }
}

async function handleSearchSubmit(e) {
  e.preventDefault();
  const query = citySearch.value.trim();
  if (!query) return;
  try {
    const places = await searchCities(query);
    if (!places.length) {
      showStatus(`No results for "${query}".`, true);
      return;
    }
    // Go straight to the top match; suggestions are still available while typing
    clearSuggestions();
    hideStatus();
    loadWeather(places[0]);
  } catch {
    showStatus('Search failed. Please check your connection and try again.', true);
  }
}

let debounceTimer;
function handleSearchInput() {
  clearTimeout(debounceTimer);
  const query = citySearch.value.trim();
  if (query.length < 2) {
    clearSuggestions();
    return;
  }
  debounceTimer = setTimeout(async () => {
    try {
      const places = await searchCities(query);
      renderSuggestions(places);
    } catch {
      // Silently ignore suggestion errors; the user can still hit search
    }
  }, 300);
}

function handleLocate() {
  if (!navigator.geolocation) {
    showStatus('Geolocation is not supported by your browser.', true);
    return;
  }
  showStatus('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const place = {
        label: 'My Location',
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      };
      loadWeather(place);
    },
    () => {
      showStatus("Couldn't access your location. Please search for a city instead.", true);
    },
    { timeout: 8000 }
  );
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function handleThemeToggle() {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('weatherTheme', theme);
  applyTheme();
}

function handleUnitToggle() {
  unit = unit === 'F' ? 'C' : 'F';
  unitToggle.textContent = `°${unit}`;
  localStorage.setItem('weatherUnit', unit);
  if (lastResult) {
    renderWeather(lastResult.place, lastResult.data);
  }
}

function applyCityViewToggle() {
  cityViewToggle.setAttribute('aria-pressed', String(cityView));
}

function handleCityViewToggle() {
  cityView = !cityView;
  localStorage.setItem('weatherCityView', cityView ? 'on' : 'off');
  applyCityViewToggle();
  updateCityView(lastResult ? lastResult.place : null);
}

// ---- Init ----
unitToggle.textContent = `°${unit}`;
applyTheme();
applyCityViewToggle();
searchForm.addEventListener('submit', handleSearchSubmit);
citySearch.addEventListener('input', handleSearchInput);
document.addEventListener('click', (e) => {
  if (!suggestionsEl.contains(e.target) && e.target !== citySearch) {
    clearSuggestions();
  }
});
locateBtn.addEventListener('click', handleLocate);
unitToggle.addEventListener('click', handleUnitToggle);
themeToggle.addEventListener('click', handleThemeToggle);
cityViewToggle.addEventListener('click', handleCityViewToggle);

renderRecents();

// Load the most recent search on first visit, otherwise try geolocation
const recents = getRecents();
if (recents.length) {
  loadWeather(recents[0]);
} else {
  hideStatus();
}
