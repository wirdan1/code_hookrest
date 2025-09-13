const axios = require('axios');

module.exports = function (app) {
  // Endpoint untuk download audio
  app.get('/api/ytdl/mp3', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan" });

    const options = {
      method: 'POST',
      url: 'https://ytdl.siputzx.my.id/download/audio',
      headers: { 'Content-Type': 'application/json' },
      data: { url, itag: 1, apiKey: '' } // itag 1 untuk default mp3
    };

    try {
      const { data } = await axios.request(options);
      res.json({ status: true, creator: 'Danz-dev', result: data });
    } catch (error) {
      res.status(500).json({ status: false, creator: 'Danz-dev', error: error.message });
    }
  });

  // Endpoint untuk download video 720p
  app.get('/api/ytmp4', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan" });

    const options = {
      method: 'POST',
      url: 'https://ytdl.siputzx.my.id/download/video',
      headers: { 'Content-Type': 'application/json' },
      data: { url, itag: 22, apiKey: '' } // itag 22 biasanya 720p
    };

    try {
      const { data } = await axios.request(options);
      res.json({ status: true, creator: 'Danz-dev', result: data });
    } catch (error) {
      res.status(500).json({ status: false, creator: 'Danz-dev', error: error.message });
    }
  });
};
