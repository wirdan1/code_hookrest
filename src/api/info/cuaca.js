const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async function scrapeCuacaRealtime() {
  const url = 'https://www.bmkg.go.id';

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      }
    });

    const $ = cheerio.load(data);

    const result = {
      suhu: $('p.text-\\[32px\\]').first().text().trim() || '',
      cuaca: $('p.text-sm.font-medium').first().text().trim() || '',
      lokasi: $('p.text-xl.font-medium').first().text().trim() || '',
      kelembapan: $('p:contains("Kelembapan:")').next().find('span').text().trim() || '',
      jarakPandang: $('p:contains("Jarak Pandang:")').next().find('span').text().trim() || '',
    };

    return {
      status: true,
      creator: 'Danz-dev',
      result
    };

  } catch (error) {
    return {
      status: false,
      creator: 'Danz-dev',
      error: error.message
    };
  }
};
