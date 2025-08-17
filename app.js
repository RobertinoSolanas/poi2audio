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

// Button click triggers search
document.getElementById("searchBtn").addEventListener("click", searchLocation);

// Pressing Enter also triggers search
document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    searchLocation();
  }
// Routing control: start from Nürnberg by default
const control = L.Routing.control({
  waypoints: [
    L.latLng(49.4521, 11.0767), // Nürnberg
    null // destination user sets
  ],
  routeWhileDragging: true
}).addTo(map);

// Allow user to set destination by clicking on the map
map.on('click', function(e) {
  const waypoints = control.getWaypoints();
  waypoints[1] = e.latlng;
  control.setWaypoints(waypoints);
});
