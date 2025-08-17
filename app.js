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

// Function to animate along route with realistic speed
function runAlongRoute() {
  const line = control._line ? control._line : null;

  if (!line) {
    alert("Please calculate a route first!");
    return;
  }

  const latlngs = line.getLatLngs();
  if (latlngs.length === 0) {
    alert("No route found!");
    return;
  }

  let i = 0;
  if (bikeMarker) map.removeLayer(bikeMarker);
  bikeMarker = L.marker(latlngs[0], { icon: bikeIcon }).addTo(map);

  const speed = 15 * 1000 / 3600; // 15 km/h in m/s
  let lastTime;

  function move(timestamp) {
    if (!lastTime) {
      lastTime = timestamp;
      requestAnimationFrame(move);
      return;
    }
    const delta = (timestamp - lastTime) / 1000; // seconds since last frame
    lastTime = timestamp;

    const distance = speed * delta;
    let nextPoint = latlngs[i];
    if (!nextPoint) return;

    const current = bikeMarker.getLatLng();
    const d = current.distanceTo(nextPoint);

    if (distance >= d) {
      bikeMarker.setLatLng(nextPoint);
      i++;
      if (i < latlngs.length) {
        requestAnimationFrame(move);
      }
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
