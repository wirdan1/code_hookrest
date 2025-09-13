import express from 'express';
import ytdlku from 'ytdlku';

const app = express();
const port = 3000;

const yt = new ytdlku({
  baseUrl: 'https://ytdl.siputzx.my.id', // optional
  apiKey: '', // bisa dikosongkan
  timeout: 30000 // default 30s
});

// Endpoint download audio mp3
app.get('/download/ytmp3', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan" });

  try {
    const info = await yt.getVideoInfo(url);
    // ambil mp3
    const mp3Format = info.video_formats.find(f => f.mime_type.includes('audio/mp4') || f.itag === 1);

    if (!mp3Format) return res.status(404).json({ status: false, error: "Format mp3 tidak ditemukan" });

    res.json({
      status: true,
      creator: 'Danz-dev',
      result: {
        title: info.title,
        thumbnail: info.thumbnail,
        url: info.url,
        mp3: mp3Format
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, creator: 'Danz-dev', error: err.message });
  }
});

// Endpoint download video 720p
app.get('/download/ytmp4', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ status: false, error: "Parameter 'url' diperlukan" });

  try {
    const info = await yt.getVideoInfo(url);
    // ambil video 720p
    const mp4Format = info.video_formats.find(f => f.height === 720);

    if (!mp4Format) return res.status(404).json({ status: false, error: "Format 720p tidak ditemukan" });

    res.json({
      status: true,
      creator: 'Danz-dev',
      result: {
        title: info.title,
        thumbnail: info.thumbnail,
        url: info.url,
        mp4: mp4Format
      }
    });
  } catch (err) {
    res.status(500).json({ status: false, creator: 'Danz-dev', error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
