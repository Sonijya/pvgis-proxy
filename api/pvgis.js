const fetch = require('node-fetch');

module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const { lat, lon, year, angle, aspect } = req.query;

    if (!lat || !lon || !year) {
        return res.status(400).json({ error: "Fehlende Parameter: lat, lon, year" });
    }

    // Standard-URL (ohne angle/aspect)
    let pvgisUrl = `https://re.jrc.ec.europa.eu/api/seriescalc?lat=${lat}&lon=${lon}&startyear=${year}&endyear=${year}&outputformat=json&browser=1&global=1`;

    // Wenn angle + aspect vorhanden sind: erweitere die URL
    if (angle && aspect) {
        pvgisUrl += `&angle=${angle}&aspect=${aspect}`;
    }

    try {
        const response = await fetch(pvgisUrl);
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: "Fehler beim Abrufen von PVGIS", detail: error.message });
    }
};
