const axios = require('axios');

module.exports = function(app) {
  app.get('/ai/texttoimg', async (req, res) => {
    const { prompt } = req.query;
    if (!prompt) {
      return res.status(400).json({
        status: false,
        message: 'Parameter ?prompt= wajib diisi!'
      });
    }

    try {
      const seed = Date.now().toString() + Math.floor(Math.random() * 1e6).toString();
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&enhance=true&nologo=true&model=flux`;

      // Ambil gambar langsung dalam bentuk binary
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

      // Tentukan tipe konten (default jpeg)
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
      res.send(response.data);

    } catch (error) {
      res.status(500).json({
        status: false,
        message: 'Gagal menghasilkan gambar: ' + error.message
      });
    }
  });
};
