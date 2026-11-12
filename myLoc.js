// ==============================
// Глобальні змінні
// ==============================
let watchId = null;

// Координати коледжу
const ourCoords = {
  latitude: 48.94321,
  longitude: 24.73380
};

let map = null;            // Leaflet-карта
let userMarkers = [];      // усі маркери місця розташування користувача
let lastCoords = null;     // останні відображені координати
let destCoords = null;     // пункт призначення
let destMarker = null;

// Налаштування геолокації
const geoOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
};

// ==============================
// Запуск
// ==============================
document.addEventListener('DOMContentLoaded', getMyLocation);

function getMyLocation() {
  initMap();
  initDestinationControls();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(displayLocation, displayError, geoOptions);

    const watchButton = document.getElementById('watch');
    watchButton.onclick = watchLocation;
    const clearWatchButton = document.getElementById('clearWatch');
    clearWatchButton.onclick = clearWatch;
  } else {
    alert('Oops, no geolocation support');
  }
}

// ==============================
// Відображення координат, точності та відстані до коледжу
// ==============================
function displayLocation(position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;

  const div = document.getElementById('location');
  div.innerHTML = `You are at Latitude: ${latitude}, Longitude: ${longitude}`;
  div.innerHTML += ` (with ${position.coords.accuracy} meters accuracy)`;

  const km = computeDistance(position.coords, ourCoords);
  const distance = document.getElementById('distance');
  distance.innerHTML = `You are ${km.toFixed(2)} km from the College`;

  updateDestinationDistance(position.coords);
  showOnMap(position);
}

// ==============================
// Обробка помилок
// ==============================
function displayError(error) {
  const errorTypes = {
    0: 'Unknown error',
    1: 'Permission denied by user',
    2: 'Position is not available',
    3: 'Request timed out'
  };
  let errorMessage = errorTypes[error.code];
  if (error.code === 0 || error.code === 2) {
    errorMessage = errorMessage + ' ' + error.message;
  }
  const div = document.getElementById('location');
  div.innerHTML = errorMessage;
}

// ==============================
// Розрахунок відстані (в км)
// ==============================
function computeDistance(startCoords, destCoords) {
  const startLatRads = degreesToRadians(startCoords.latitude);
  const startLongRads = degreesToRadians(startCoords.longitude);
  const destLatRads = degreesToRadians(destCoords.latitude);
  const destLongRads = degreesToRadians(destCoords.longitude);

  const Radius = 6371; // радіус Землі в км

  // Math.min захищає від похибки округлення (acos(1.0000000002) = NaN)
  const cosValue = Math.sin(startLatRads) * Math.sin(destLatRads) +
    Math.cos(startLatRads) * Math.cos(destLatRads) *
    Math.cos(startLongRads - destLongRads);
  const distance = Math.acos(Math.min(1, Math.max(-1, cosValue))) * Radius;

  return distance;
}

function degreesToRadians(degrees) {
  const radians = (degrees * Math.PI) / 180;
  return radians;
}

// ==============================
// Відстеження в реальному часі
// ==============================
function watchLocation() {
  if (watchId === null) {
    watchId = navigator.geolocation.watchPosition(displayLocation, displayError, geoOptions);
  }
}

function clearWatch() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

// ==============================
// Карта (Leaflet)
// ==============================
function initMap() {
  if (typeof L === 'undefined') {
    document.getElementById('map').textContent =
      'Не вдалося завантажити бібліотеку Leaflet (перевірте підключення до Інтернету).';
    return;
  }

  // Поки координати користувача невідомі — центруємо карту на коледжі
  map = L.map('map').setView([ourCoords.latitude, ourCoords.longitude], 13);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  L.marker([ourCoords.latitude, ourCoords.longitude])
    .addTo(map)
    .bindPopup('College');
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('uk-UA');
}

function showOnMap(position) {
  if (!map) {
    return;
  }

  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  // не дублюємо маркер, якщо координати не змінилися
  if (lastCoords && lastCoords.lat === lat && lastCoords.lon === lon) {
    return;
  }
  lastCoords = { lat: lat, lon: lon };

  const marker = L.marker([lat, lon]).addTo(map);
  marker.bindPopup(
    `<b>Ваше місце розташування</b><br>` +
    `Широта: ${lat}<br>Довгота: ${lon}<br>` +
    `Точність: ${position.coords.accuracy} м<br>` +
    `Час: ${formatTime(position.timestamp)}`
  );

  if (userMarkers.length === 0) {
    // перше визначення: центруємо карту та одразу відкриваємо popup
    map.setView([lat, lon], 15);
    marker.openPopup();
  } else {
    map.panTo([lat, lon]);
  }
  userMarkers.push(marker);
}

// ==============================
// Пункт призначення
// ==============================
function initDestinationControls() {
  document.getElementById('setDestination').onclick = setDestination;
  document.getElementById('goDestination').onclick = goToDestination;
}

function setDestination() {
  const message = document.getElementById('destination-message');
  const lat = parseFloat(document.getElementById('dest-lat').value);
  const lon = parseFloat(document.getElementById('dest-lon').value);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    message.textContent = 'Введіть коректні координати (широта: -90…90, довгота: -180…180).';
    return;
  }
  message.textContent = '';

  destCoords = { latitude: lat, longitude: lon };

  if (map) {
    if (destMarker) {
      map.removeLayer(destMarker);
    }
    destMarker = L.marker([lat, lon]).addTo(map);
    destMarker.bindPopup(`<b>Пункт призначення</b><br>Широта: ${lat}<br>Довгота: ${lon}`);
  }

  if (lastCoords) {
    updateDestinationDistance({ latitude: lastCoords.lat, longitude: lastCoords.lon });
  }
}

function goToDestination() {
  const message = document.getElementById('destination-message');
  if (!destCoords) {
    message.textContent = 'Спочатку задайте координати пункту призначення.';
    return;
  }
  message.textContent = '';

  if (map) {
    map.flyTo([destCoords.latitude, destCoords.longitude], 15);
    destMarker.openPopup();
  }
}

function updateDestinationDistance(coords) {
  const div = document.getElementById('destination-distance');
  if (!destCoords) {
    div.innerHTML = '';
    return;
  }
  const km = computeDistance(coords, destCoords);
  div.innerHTML = `Відстань до пункту призначення: ${km.toFixed(2)} km`;
}
