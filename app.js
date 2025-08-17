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
let control = L.Routing.control({
  waypoints: [],
  routeWhileDragging: true,
  router: L.Routing.osrmv1({
    serviceUrl: 'https://router.project-osrm.org/route/v1',
    profile: 'bicycle'
  })
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

 // -------- Map click A/B selection --------
let startLatLng = null;
let destLatLng = null;
let startMarker = null;
let destMarker = null;

function reverseGeocode(latlng, callback) {
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`)
    .then(r => r.json())
    .then(data => {
      if (data && data.display_name) {
        callback(data.display_name);
      } else {
        callback(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      }
    })
    .catch(() => {
      callback(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
    });
}

map.on("click", function (e) {
  if (!startLatLng) {
    // First click sets START
    startLatLng = e.latlng;
    if (startMarker) map.removeLayer(startMarker);
    startMarker = L.marker(startLatLng, { icon: L.icon({ iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png", iconSize: [32, 32], iconAnchor: [16, 32] }) })
      .addTo(map).bindPopup("Start (A)").openPopup();

    // update Start input box
    reverseGeocode(startLatLng, addr => {
      document.getElementById("startInput").value = addr;
    });

  } else if (!destLatLng) {
    // Second click sets DESTINATION
    destLatLng = e.latlng;
    if (destMarker) map.removeLayer(destMarker);
    destMarker = L.marker(destLatLng, { icon: L.icon({ iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/red-dot.png", iconSize: [32, 32], iconAnchor: [16, 32] }) })
      .addTo(map).bindPopup("Destination (B)").openPopup();

    // update Destination input box
    reverseGeocode(destLatLng, addr => {
      document.getElementById("destInput").value = addr;
    });

    // update router with current mode
    const mode = document.getElementById("modeSelect").value;
    control.options.router = L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: mode
    });
    control.setWaypoints([startLatLng, destLatLng]);
  } else {
    // Reset if both already set → new START
    startLatLng = e.latlng;
    destLatLng = null;
    if (startMarker) map.removeLayer(startMarker);
    if (destMarker) {
      map.removeLayer(destMarker);
      destMarker = null;
    }
    startMarker = L.marker(startLatLng, { icon: L.icon({ iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png", iconSize: [32, 32], iconAnchor: [16, 32] }) })
      .addTo(map).bindPopup("Start (A)").openPopup();

    reverseGeocode(startLatLng, addr => {
      document.getElementById("startInput").value = addr;
      document.getElementById("destInput").value = "";
    });

    control.setWaypoints([startLatLng, null]);
  }
});

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

    // Update router with selected mode
    const mode = document.getElementById("modeSelect").value;
    control.options.router = L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: mode
    });
    control.setWaypoints([startLatLng, destLatLng]);

    if (marker) map.removeLayer(marker);
    marker = L.marker(destLatLng).addTo(map)
      .bindPopup(`<b>${destQuery}</b><br>Mode: ${mode}`).openPopup();
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
let instructions = [];
let currentInstructionIndex = 0;

let paused = false;   // 🚦 new state
let animating = false;
let i = 0;            // index for animation
let lastTime;         // remember timestamp for resume

// Capture route when found
control.on('routesfound', function(e) {
  const routes = e.routes;
  if (routes.length > 0) {
    routeCoords = routes[0].coordinates; // array of {lat, lng}

    // Extract instructions list and reset index
    instructions = routes[0].instructions;
    currentInstructionIndex = 0;

    // Show instructions in panel
    const listEl = document.getElementById("directionsList");
    listEl.innerHTML = "";
    instructions.forEach(instr => {
      const li = document.createElement("li");
      li.textContent = instr.text;
      listEl.appendChild(li);
    });
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

  i = 0;
  paused = false;
  animating = true;
  lastTime = null;

  function move(timestamp) {
    if (paused) {
      animating = false;
      return; // stop loop until resumed
    }
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

      if (currentInstructionIndex < instructions.length && i >= instructions[currentInstructionIndex].index) {
        const text = instructions[currentInstructionIndex].text;
        speechSynthesis.speak(new SpeechSynthesisUtterance(text));
        currentInstructionIndex++;
      }

      i++;
      if (i >= routeCoords.length) {
        i = 0; 
        currentInstructionIndex = 0;
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

// Stop / Continue handlers
document.getElementById("stopBtn").addEventListener("click", () => {
  paused = true;
  animating = false;

  if (!bikeMarker) return;
  const pos = bikeMarker.getLatLng();
  const radius = 500; // meters

  const query = `
    [out:json];
    (
      node(around:${radius},${pos.lat},${pos.lng})[amenity];
      way(around:${radius},${pos.lat},${pos.lng})[amenity];
      relation(around:${radius},${pos.lat},${pos.lng})[amenity];
    );
    out center;
  `;

  fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
  })
    .then(res => res.json())
    .then(data => {
      const listEl = document.getElementById("poiList");
      listEl.innerHTML = "";

      if (data.elements.length === 0) {
        listEl.innerHTML = "<li>No POIs found nearby.</li>";
        return;
      }

      data.elements.forEach(el => {
        const li = document.createElement("li");
        li.textContent = el.tags && el.tags.name
          ? `${el.tags.name} (${el.tags.amenity})`
          : el.tags.amenity || "POI";
        listEl.appendChild(li);
      });
    })
    .catch(err => console.error("POI fetch error", err));
});

document.getElementById("continueBtn").addEventListener("click", () => {
  if (!animating && paused) {
    paused = false;
    animating = true;
    requestAnimationFrame(function step(ts){ 
      lastTime = ts; 
      (function move(timestamp){
        if (paused) { animating = false; return; }
        if (!lastTime) { lastTime = timestamp; requestAnimationFrame(move); return; }
        const delta = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        const distance = speed * delta;
        let nextPoint = routeCoords[i];
        if (!nextPoint) return;
        const current = bikeMarker.getLatLng();
        const d = current.distanceTo(nextPoint);
        if (distance >= d) {
          bikeMarker.setLatLng(nextPoint);
          if (currentInstructionIndex < instructions.length && i >= instructions[currentInstructionIndex].index) {
            speechSynthesis.speak(new SpeechSynthesisUtterance(instructions[currentInstructionIndex].text));
            currentInstructionIndex++;
          }
          i++;
          if (i >= routeCoords.length) { i = 0; currentInstructionIndex = 0; }
          requestAnimationFrame(move);
        } else {
          const ratio = distance / d;
          bikeMarker.setLatLng([
            current.lat + (nextPoint.lat - current.lat) * ratio,
            current.lng + (nextPoint.lng - current.lng) * ratio
          ]);
          requestAnimationFrame(move);
        }
      })(ts);
    });
  }
});

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
