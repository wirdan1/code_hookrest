const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  app.get('/api/cuaca-realtime', async (req, res) => {
    const url = 'https://www.bmkg.go.id';

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        },
      });

      const $ = cheerio.load(data);

      // Ambil suhu
      const suhu = $('p.text-\\[32px\\]').first().text().trim() || '';

      // Ambil lokasi
      const lokasi = $('p.text-xl.font-medium').first().text().trim() || '';

      // Ambil cuaca → cari elemen dekat suhu
      let cuaca = '';
      const suhuElem = $('p.text-\\[32px\\]').first().parent();
      cuaca = suhuElem.find('p.text-sm.font-medium').first().text().trim();

      // Ambil kelembapan
      const kelembapan = $('p:contains("Kelembapan")')
        .next()
        .find('span')
        .text()
        .trim() || '';

      // Ambil jarak pandang
      const jarakPandang = $('p:contains("Jarak Pandang")')
        .next()
        .find('span')
        .text()
        .trim() || '';

      res.json({
        status: true,
        creator: 'Danz-dev',
        result: {
          suhu,
          cuaca,
          lokasi,
          kelembapan,
          jarakPandang,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'Danz-dev',
        error: error.message,
      });
    }
  });
};
