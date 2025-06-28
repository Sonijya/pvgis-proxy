<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dachberechnung mit Sonnenstand</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/suncalc/1.9.0/suncalc.min.js"></script>
    <style>
        #map { height: 400px; margin-top: 20px; }
    </style>
</head>
<body class="container mt-4">

<h1 class="text-center">Photovoltaik-Dachberechnung inkl. Sonnenstand</h1>

<form id="pv-form">
    <div class="mb-3">
        <label for="winkel" class="form-label">Dachneigung (°)</label>
        <input type="number" class="form-control" id="winkel" required>
    </div>
    <div class="mb-3">
        <label for="größe" class="form-label">Dachgröße (m²)</label>
        <input type="number" class="form-control" id="größe" required>
    </div>
    <div class="mb-3">
        <label for="jahr" class="form-label">Jahr</label>
        <input type="number" class="form-control" id="jahr" value="2020" min="2005" max="2024" required>
    </div>
    <div class="mb-3">
        <label for="ausrichtung" class="form-label">Ausrichtung (Himmelsrichtung)</label>
        <select class="form-control" id="ausrichtung" required>
            <option value="0">Norden</option>
            <option value="45">Nordost</option>
            <option value="90">Osten</option>
            <option value="135">Südost</option>
            <option value="180" selected>Süden</option>
            <option value="225">Südwest</option>
            <option value="270">Westen</option>
            <option value="315">Nordwest</option>
        </select>
    </div>
    <div class="mb-3">
        <label for="adresse" class="form-label">Adresse oder Koordinaten</label>
        <input type="text" class="form-control" id="adresse" placeholder="z. B. Berlin oder 52.5,13.4">
    </div>
    <div id="map"></div>
    <input type="hidden" id="lat">
    <input type="hidden" id="lng">
    <button type="submit" class="btn btn-primary mt-3">Berechnen</button>
</form>

<div class="mt-5">
    <h4>Ergebnisse</h4>
    <p id="ladeanzeige">Noch keine Berechnung durchgeführt.</p>
    <pre id="text-ergebnisse"></pre>
    <canvas id="balkenChart" height="100"></canvas>
    <button class="btn btn-secondary mt-3" id="exportCsv">CSV exportieren</button>
</div>

<script>
    const map = L.map('map').setView([51.1657, 10.4515], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker;
    map.on('click', function(e) {
        if (marker) map.removeLayer(marker);
        marker = L.marker(e.latlng).addTo(map);
        document.getElementById('lat').value = e.latlng.lat;
        document.getElementById('lng').value = e.latlng.lng;
    });

    document.getElementById("pv-form").addEventListener("submit", async function(e) {
        e.preventDefault();

        const dachwinkel = document.getElementById("winkel").value;
        const dachfläche = document.getElementById("größe").value;
        const jahr = document.getElementById("jahr").value;
        const azimut = document.getElementById("ausrichtung").value;
        let lat = document.getElementById("lat").value;
        let lon = document.getElementById("lng").value;
        const adresse = document.getElementById("adresse").value;

        if (!lat || !lon) {
            if (!adresse) {
                alert("Bitte Adresse eingeben oder Karte klicken.");
                return;
            }
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}`);
            const daten = await response.json();
            if (daten.length === 0) {
                alert("Adresse nicht gefunden.");
                return;
            }
            lat = daten[0].lat;
            lon = daten[0].lon;
        }

        document.getElementById("ladeanzeige").innerText = "Lade Daten und berechne…";

        const proxyUrl = `https://pvgis-proxy.vercel.app/api/pvgis?lat=${lat}&lon=${lon}&year=${jahr}`;
        const res = await fetch(proxyUrl);
        const json = await res.json();

        if (!json.outputs || !json.outputs.daily_profile) {
            document.getElementById("ladeanzeige").innerText = "Fehler beim Abrufen der PVGIS-Daten.";
            return;
        }

        const tagesdaten = json.outputs.daily_profile;
        const monatsertrag = Array(12).fill(0);

        tagesdaten.forEach(tag => {
            const datum = new Date(tag.time);
            const monat = datum.getMonth();
            const ertrag = tag["G(h)"] * dachfläche;
            monatsertrag[monat] += ertrag;
        });

        const jahresertrag = monatsertrag.reduce((a, b) => a + b, 0);
        const maxWert = Math.max(...monatsertrag);
        const minWert = Math.min(...monatsertrag);
        const maxMonat = monatsertrag.indexOf(maxWert) + 1;
        const minMonat = monatsertrag.indexOf(minWert) + 1;

        document.getElementById("ladeanzeige").innerText = "";
        document.getElementById("text-ergebnisse").innerText =
            `Erwartete Jahreserzeugung: ${jahresertrag.toFixed(2)} kWh\n` +
            `Bester Monat: ${maxMonat} mit ${maxWert.toFixed(2)} kWh\n` +
            `Schwächster Monat: ${minMonat} mit ${minWert.toFixed(2)} kWh`;

        const ctx = document.getElementById("balkenChart").getContext("2d");
        if (window.myChart) window.myChart.destroy();
        window.myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
                datasets: [{
                    label: 'Monatlicher Ertrag (kWh)',
                    data: monatsertrag.map(v => v.toFixed(2)),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    });
</script>
</body>
</html>
