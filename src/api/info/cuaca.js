const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  async function scrapeCuacaRealtime() {
    const url = 'https://www.bmkg.go.id';

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const $ = cheerio.load(data);
      const result = {};

      // Suhu
      result.suhu = $('.text-\\[32px\\]').first().text().trim();

      // Cuaca
      result.cuaca = $('.text-sm.font-medium').first().text().trim();

      // Lokasi
      result.lokasi = $('.text-xl.font-medium').first().text().trim();

      // Kelembapan
      result.kelembapan = $('p:contains("Kelembapan:")')
        .next()
        .find('span')
        .text()
        .trim();

      // Angin
      const anginText = $('p:contains("Angin:")').next().text().trim();
      if (anginText) {
        const [kecepatan, arah] = anginText.split(' ');
        result.anginKecepatan = kecepatan;
        result.anginArah = arah;
      }

      // Jarak Pandang
      result.jarakPandang = $('p:contains("Jarak Pandang:")')
        .next()
        .find('span')
        .text()
        .trim();

      return result;
    } catch (error) {
      throw new Error(`Gagal scrape: ${error.message}`);
    }
  }

  // Endpoint Express
  app.get('/api/cuaca-realtime', async (req, res) => {
    try {
      const result = await scrapeCuacaRealtime();
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
