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
