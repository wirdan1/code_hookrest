const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  async function scrapeCuacaBMKG(kota = 'Jakarta Pusat', areaId = '5015', prov = '6') {
    const baseUrl = 'https://www.bmkg.go.id/cuaca/prakiraan-cuaca.bmkg';
    const url = `${baseUrl}?Kota=${encodeURIComponent(kota)}&AreaID=${areaId}&Prov=${prov}`;

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        },
      });

      const $ = cheerio.load(data);
      const result = [];

      $('.prakicu-kabkota').each((i, elem) => {
        const tanggal = $(elem).find('.kabkota-title').text().trim();
        const cuaca = $(elem).find('.kabkota-cuaca').text().trim();
        const suhu = $(elem).find('.kabkota-suhu').text().trim();
        const kelembapan = $(elem).find('.kabkota-lembab').text().trim();

        if (tanggal) {
          result.push({
            tanggal,
            cuaca,
            suhu,
            kelembapan,
          });
        }
      });

      return result;
    } catch (error) {
      throw new Error(`Gagal scrape: ${error.message}`);
    }
  }

  // Endpoint API
  app.get('/api/cuaca', async (req, res) => {
    const { kota = 'Jakarta Pusat', areaId = '5015', prov = '6' } = req.query;

    try {
      const result = await scrapeCuacaBMKG(kota, areaId, prov);
      res.json({
        status: true,
        creator: 'Danz-dev',
        result,
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message,
      });
    }
  });
};
