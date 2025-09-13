const axios = require('axios');
const ytdlku = require('ytdlku');

module.exports = function (app) {
  // Inisialisasi ytdlku
  const yt = new ytdlku({
    baseUrl: 'https://ytdl.siputzx.my.id',
    // apiKey dihapus karena optional dan boleh kosong
    timeout: 30000 // Timeout 30 detik sesuai kode asli
  });

  // Endpoint untuk mengunduh audio (ytmp3)
  app.get('/download/ytmp3', async (req, res) => {
    const { url, itag } = req.query;

    // Validasi parameter
    if (!url || !itag) {
      console.error('Missing parameters:', { url, itag });
      return res.status(400).json({
        status: false,
        message: 'Berikan parameter url dan itag. Contoh: /tools/download/ytmp3?url=https://www.youtube.com/watch?v=cu9EYHjohp0&itag=140'
      });
    }

    try {
      // Validasi itag dengan ytdlku
      console.log('Fetching video info for:', url);
      const videoInfo = await yt.getVideoInfo(url);
      const format = videoInfo.video_formats.find(f => f.itag == itag && f.mimeType.includes('audio'));
      if (!format) {
        console.error('Invalid audio itag:', itag);
        throw new Error('Itag tidak valid untuk audio.');
      }

      // Mengunduh audio
      console.log('Sending request to download audio:', { url, itag });
      const options = {
        method: 'POST',
        url: 'https://ytdl.siputzx.my.id/download/audio',
        headers: { 'Content-Type': 'application/json' },
        data: { url, itag: parseInt(itag) }, // apiKey dihapus karena optional
        timeout: 30000 // Timeout 30 detik
      };

      const { data } = await axios.request(options);
      console.log('Audio download response:', data);

      res.json({
        status: true,
        url,
        results: {
          title: videoInfo.title || 'Unknown Title',
          itag: parseInt(itag),
          mimeType: format.mimeType,
          downloadUrl: data.url || data // Sesuaikan dengan struktur respons API
        }
      });
    } catch (error) {
      console.error('Error in /tools/download/ytmp3:', {
        message: error.message,
        stack: error.stack,
        url,
        itag
      });
      res.status(500).json({
        status: false,
        message: 'Terjadi kesalahan saat mengunduh audio.',
        error: error.message
      });
    }
  });

  // Endpoint untuk mengunduh video (ytmp4)
  app.get('/download/ytmp4', async (req, res) => {
    const { url, itag } = req.query;

    // Validasi parameter
    if (!url || !itag) {
      console.error('Missing parameters:', { url, itag });
      return res.status(400).json({
        status: false,
        message: 'Berikan parameter url dan itag. Contoh: /tools/download/ytmp4?url=https://www.youtube.com/watch?v=cu9EYHjohp0&itag=18'
      });
    }

    try {
      // Validasi itag dengan ytdlku
      console.log('Fetching video info for:', url);
      const videoInfo = await yt.getVideoInfo(url);
      const format = videoInfo.video_formats.find(f => f.itag == itag && f.mimeType.includes('video'));
      if (!format) {
        console.error('Invalid video itag:', itag);
        throw new Error('Itag tidak valid untuk video.');
      }

      // Mengunduh video
      console.log('Sending request to download video:', { url, itag });
      const options = {
        method: 'POST',
        url: 'https://ytdl.siputzx.my.id/download/video',
        headers: { 'Content-Type': 'application/json' },
        data: { url, itag: parseInt(itag) }, // apiKey dihapus karena optional
        timeout: 30000 // Timeout 30 detik
      };

      const { data } = await axios.request(options);
      console.log('Video download response:', data);

      res.json({
        status: true,
        url,
        results: {
          title: videoInfo.title || 'Unknown Title',
          itag: parseInt(itag),
          resolution: `${format.height}p`,
          mimeType: format.mimeType,
          downloadUrl: data.url || data // Sesuaikan dengan struktur respons API
        }
      });
    } catch (error) {
      console.error('Error in /tools/download/ytmp4:', {
        message: error.message,
        stack: error.stack,
        url,
        itag
      });
      res.status(500).json({
        status: false,
        message: 'Terjadi kesalahan saat mengunduh video.',
        error: error.message
      });
    }
  });
};
