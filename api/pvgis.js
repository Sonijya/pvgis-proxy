
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  res.setHeader('Access-Control-Allow-Origin', '*'); // 🔥 das ist der wichtige Fix

  if (!lat || !lon || !year || !angle || !aspect) {
    return res.status(400).json({ error: "Fehlende Parameter: lat, lon, year, angle, aspect" });
  }


  if (!lat || !lon || !year) {
    return res.status(400).json({ error: "Fehlende Parameter: lat, lon, year" });
  }

  const pvgisUrl = `https://re.jrc.ec.europa.eu/api/seriescalc?lat=${lat}&lon=${lon}&startyear=${year}&endyear=${year}&outputformat=json&browser=1&global=1&components=1&angle=${angle}&aspect=${aspect}`;



  try {
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Fehler beim Abrufen von PVGIS", detail: error.message });
  }
};
