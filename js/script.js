// ---- Weather code -> description/icon (WMO codes, used by Open-Meteo) ----
const WEATHER_CODES = {
  0: { desc: 'Clear sky', icon: '☀️' },
  1: { desc: 'Mainly clear', icon: '🌤️' },
  2: { desc: 'Partly cloudy', icon: '⛅' },
  3: { desc: 'Overcast', icon: '☁️' },
  45: { desc: 'Fog', icon: '🌫️' },
  48: { desc: 'Depositing rime fog', icon: '🌫️' },
  51: { desc: 'Light drizzle', icon: '🌦️' },
  53: { desc: 'Drizzle', icon: '🌦️' },
  55: { desc: 'Dense drizzle', icon: '🌦️' },
  56: { desc: 'Freezing drizzle', icon: '🌧️' },
  57: { desc: 'Dense freezing drizzle', icon: '🌧️' },
  61: { desc: 'Slight rain', icon: '🌧️' },
  63: { desc: 'Rain', icon: '🌧️' },
  65: { desc: 'Heavy rain', icon: '🌧️' },
  66: { desc: 'Freezing rain', icon: '🌧️' },
  67: { desc: 'Heavy freezing rain', icon: '🌧️' },
  71: { desc: 'Slight snow', icon: '❄️' },
  73: { desc: 'Snow', icon: '❄️' },
  75: { desc: 'Heavy snow', icon: '❄️' },
  77: { desc: 'Snow grains', icon: '❄️' },
  80: { desc: 'Slight rain showers', icon: '🌦️' },
  81: { desc: 'Rain showers', icon: '🌦️' },
  82: { desc: 'Violent rain showers', icon: '⛈️' },
  85: { desc: 'Slight snow showers', icon: '🌨️' },
  86: { desc: 'Heavy snow showers', icon: '🌨️' },
  95: { desc: 'Thunderstorm', icon: '⛈️' },
  96: { desc: 'Thunderstorm with hail', icon: '⛈️' },
  99: { desc: 'Severe thunderstorm with hail', icon: '⛈️' },
};

function weatherInfo(code) {
  return WEATHER_CODES[code] || { desc: 'Unknown', icon: '❔' };
}

// ---- State ----
let unit = localStorage.getItem('weatherUnit') || 'F'; // 'F' or 'C'
let lastResult = null; // raw Celsius data from the API, re-rendered on unit toggle

// ---- Elements ----
const searchForm = document.getElementById('searchForm');
const citySearch = document.getElementById('citySearch');
const suggestionsEl = document.getElementById('suggestions');
const recentChipsEl = document.getElementById('recentChips');
const statusEl = document.getElementById('statusMessage');
const unitToggle = document.getElementById('unitToggle');
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
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
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

  currentWeatherEl.hidden = false;

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
      <div class="day-icon">${dayInfo.icon}</div>
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
searchForm.addEventListener('submit', handleSearchSubmit);
citySearch.addEventListener('input', handleSearchInput);
document.addEventListener('click', (e) => {
  if (!suggestionsEl.contains(e.target) && e.target !== citySearch) {
    clearSuggestions();
  }
});
locateBtn.addEventListener('click', handleLocate);
unitToggle.addEventListener('click', handleUnitToggle);

renderRecents();

// Load the most recent search on first visit, otherwise try geolocation
const recents = getRecents();
if (recents.length) {
  loadWeather(recents[0]);
} else {
  hideStatus();
}
