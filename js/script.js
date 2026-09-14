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

// ---- Elements ----
const searchForm = document.getElementById('searchForm');
const citySearch = document.getElementById('citySearch');
const suggestionsEl = document.getElementById('suggestions');
const recentChipsEl = document.getElementById('recentChips');
const statusEl = document.getElementById('statusMessage');
const unitToggle = document.getElementById('unitToggle');
const themeToggle = document.getElementById('themeToggle');
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
  } catch (err) {
    showStatus("Couldn't load weather for that location. Please try again.", true);
    currentWeatherEl.hidden = true;
    hourlyForecastEl.hidden = true;
    forecastEl.hidden = true;
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

// ---- Init ----
unitToggle.textContent = `°${unit}`;
applyTheme();
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

renderRecents();

// Load the most recent search on first visit, otherwise try geolocation
const recents = getRecents();
if (recents.length) {
  loadWeather(recents[0]);
} else {
  hideStatus();
}
