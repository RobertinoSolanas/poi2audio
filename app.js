// Initialize the map
const map = L.map('map').setView([49.4521, 11.0767], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
}).addTo(map);

// Add a marker
let marker = L.marker([49.4521, 11.0767]).addTo(map);
marker.bindPopup("<b>Willkommen in Nürnberg!</b>").openPopup();

// Search handler
function searchLocation() {
  const query = document.getElementById("searchInput").value;
  if (!query) return;
  
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        map.setView([lat, lon], 13);

        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`<b>${data[0].display_name}</b>`).openPopup();

        // Update routing destination
        const waypoints = control.getWaypoints();
        waypoints[1] = L.latLng(lat, lon);
        control.setWaypoints(waypoints);
      } else {
        alert("Location not found!");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error fetching location!");
    });
}

// Bind search button and Enter key
document.getElementById("searchBtn").addEventListener("click", searchLocation);
document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    searchLocation();
  }
});

// Routing control: initially empty (no route)
const control = L.Routing.control({
  waypoints: [],
  routeWhileDragging: true
}).addTo(map);

// Function to geocode a query into coordinates
function geocode(query) {
  return fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(r => r.json())
    .then(data => {
      if (data && data.length > 0) {
        return L.latLng(parseFloat(data[0].lat), parseFloat(data[0].lon));
      } else {
        alert(`Location not found: ${query}`);
        return null;
      }
    });
}

// Route button handler
document.getElementById("routeBtn").addEventListener("click", async () => {
  const startQuery = document.getElementById("startInput").value;
  const destQuery = document.getElementById("destInput").value;

  if (!startQuery || !destQuery) {
    alert("Please enter both start and destination!");
    return;
  }

  const startLatLng = await geocode(startQuery);
  const destLatLng = await geocode(destQuery);

  if (startLatLng && destLatLng) {
    map.setView(startLatLng, 12);
    control.setWaypoints([startLatLng, destLatLng]);

    if (marker) map.removeLayer(marker);
    marker = L.marker(destLatLng).addTo(map)
      .bindPopup(`<b>${destQuery}</b>`).openPopup();
  }
});

// Custom bicycle icon
const bikeIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2972/2972185.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

let bikeMarker = null;
let routeCoords = [];

// Capture route when found
control.on('routesfound', function(e) {
  const routes = e.routes;
  if (routes.length > 0) {
    routeCoords = routes[0].coordinates; // array of {lat, lng}
  }
});

// Function to animate along route with realistic speed
function runAlongRoute() {
  if (!routeCoords || routeCoords.length === 0) {
    alert("Please calculate a route first!");
    return;
  }

  if (bikeMarker) map.removeLayer(bikeMarker);
  bikeMarker = L.marker(routeCoords[0], { icon: bikeIcon }).addTo(map);

  let lastTime;
  let i = 0;

  function move(timestamp) {
    if (!lastTime) {
      lastTime = timestamp;
      requestAnimationFrame(move);
      return;
    }
    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    const distance = speed * delta;
    let nextPoint = routeCoords[i];
    if (!nextPoint) return;

    const current = bikeMarker.getLatLng();
    const d = current.distanceTo(nextPoint);

// Loop over route forever
    if (distance >= d) {
      bikeMarker.setLatLng(nextPoint);
      i++;
      if (i >= routeCoords.length) {
        i = 0; // restart from beginning
      }
      requestAnimationFrame(move);
    } else {
      const ratio = distance / d;
      const newLat = current.lat + (nextPoint.lat - current.lat) * ratio;
      const newLng = current.lng + (nextPoint.lng - current.lng) * ratio;
      bikeMarker.setLatLng([newLat, newLng]);
      requestAnimationFrame(move);
    }
  }
  requestAnimationFrame(move);
}

// Run button handler
document.getElementById("runBtn").addEventListener("click", runAlongRoute);

// -------- Speed controls --------
let speedKmh = 20;
let speed = speedKmh * 1000 / 3600;

function updateSpeedDisplay() {
  document.getElementById("speedDisplay").textContent = speedKmh + " km/h";
  document.getElementById("speedInput").value = speedKmh;
}

document.getElementById("speedPlus").addEventListener("click", () => {
  speedKmh += 5;
  speed = speedKmh * 1000 / 3600;
  updateSpeedDisplay();
});

document.getElementById("speedMinus").addEventListener("click", () => {
  if (speedKmh > 5) {
    speedKmh -= 5;
    speed = speedKmh * 1000 / 3600;
    updateSpeedDisplay();
  }
});

document.getElementById("speedInput").addEventListener("change", (e) => {
  const val = parseInt(e.target.value, 10);
  if (!isNaN(val) && val >= 5) {
    speedKmh = val;
    speed = speedKmh * 1000 / 3600;
    updateSpeedDisplay();
  } else {
    e.target.value = speedKmh;
  }
});

// Initialize display
updateSpeedDisplay();
