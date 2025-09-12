const yts = require('yt-search');
const fetch = require('node-fetch');

const ssvid = {
  baseUrl: 'https://ssvid.net',

  baseHeaders: {
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    origin: 'https://ssvid.net',
    referer: 'https://ssvid.net/youtube-to-mp3'
  },

  async hit(path, payload) {
    const body = new URLSearchParams(payload);
    const opts = { headers: this.baseHeaders, body, method: 'post' };
    const r = await fetch(`${this.baseUrl}${path}`, opts);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}\n${await r.text()}`);
    return await r.json();
  },

  async download(queryOrUrl, format = 'mp3') {
    // First hit search
    let search = await this.hit('/api/ajax/search', {
      query: queryOrUrl,
      cf_token: '',
      vt: 'youtube'
    });

    if (search.p === 'search') {
      if (!search?.items?.length) throw new Error(`hasil pencarian ${queryOrUrl} tidak ada`);
      const { v } = search.items[0];
      const videoUrl = 'https://www.youtube.com/watch?v=' + v;

      // hit lagi untuk get vid
      search = await this.hit('/api/ajax/search', {
        query: videoUrl,
        cf_token: '',
        vt: 'youtube'
      });
    }

    const vid = search.vid;
    let key;

    if (format === 'mp3') {
      key = search.links?.mp3?.mp3128?.k;
    } else {
      const allFormats = Object.entries(search.links.mp4);
      const find = allFormats.find(v => v[1].q === format);
      key = find?.[1]?.k;
    }

    if (!key) throw new Error(`Format ${format} gak tersedia`);

    // Convert
    const convert = await this.hit('/api/ajax/convert', { k: key, vid });

    if (convert.c_status === 'CONVERTING') {
      let convert2;
      const limit = 5;
      let attempt = 0;
      do {
        attempt++;
        console.log(`cek convert ${attempt}/${limit}`);
        convert2 = await this.hit('/api/convert/check?hl=en', {
          vid,
          b_id: convert.b_id
        });
        if (convert2.c_status === 'CONVERTED') return convert2;
        await new Promise(r => setTimeout(r, 5000));
      } while (attempt < limit && convert2.c_status === 'CONVERTING');
      throw new Error('file belum siap / status belum diketahui');
    } else {
      return convert;
    }
  }
};

module.exports = function (app) {
  app.get('/dl/yt/play', async (req, res) => {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'query' diperlukan"
      });
    }

    try {
      // Cari video pertama dengan yt-search
      const searchResult = await yts(query);
      const video = searchResult.videos[0];
      if (!video) {
        return res.status(404).json({ status: false, error: 'Video tidak ditemukan' });
      }

      // Convert pakai ssvid → MP3
      const mp3 = await ssvid.download(video.url, 'mp3');

      res.json({
        status: true,
        creator: 'Danz-dev',
        result: {
          video: {
            title: video.title,
            url: video.url,
            description: video.description,
            duration: video.timestamp,
            views: video.views,
            thumbnail: video.thumbnail
          },
          mp3
        }
      });
    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  });
};
