const puppeteer = require('puppeteer');

module.exports = function (app) {
  async function scrapeCuacaRealtime() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    );

    await page.goto('https://www.bmkg.go.id', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    await page.waitForSelector('.weather-now', { timeout: 10000 });

    const data = await page.evaluate(() => {
      const result = {};
      result.suhu = document.querySelector('.temperature')?.textContent.trim() || null;
      result.cuaca = document.querySelector('.description')?.textContent.trim() || null;
      result.lokasi = document.querySelector('.location')?.textContent.trim() || null;
      result.kelembapan = document.querySelector('[data-testid="humidity"]')?.textContent.trim() || null;
      result.anginKecepatan = document.querySelector('[data-testid="wind-speed"]')?.textContent.trim() || null;
      result.anginArah = document.querySelector('[data-testid="wind-direction"]')?.textContent.trim() || null;
      result.jarakPandang = document.querySelector('[data-testid="visibility"]')?.textContent.trim() || null;
      return result;
    });

    await browser.close();
    return data;
  }

  // Endpoint API
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
