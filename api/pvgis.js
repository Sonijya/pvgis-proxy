const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { lat, lon, year } = req.query;

  if (!lat || !lon || !year) {
    return res.status(400).json({ error: "Fehlende Parameter: lat, lon, year" });
  }

  const url = `https://re.jrc.ec.europa.eu/api/seriescalc?lat=${lat}&lon=${lon}&startyear=${year}&endyear=${year}&outputformat=json&browser=1&global=1&angle=30&aspect=180`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Fehler beim Abrufen von PVGIS", detail: error.message });
  }
};
