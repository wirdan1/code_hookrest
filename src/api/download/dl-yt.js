/*
  Downloader YouTube via ssvid.net
  Endpoint:
    GET /ytdl/mp3?url=YOUTUBE_URL
    GET /ytdl/mp4?url=YOUTUBE_URL   (default 720p)
*/

const fetch = require('node-fetch');

const yt = {
  baseUrl: 'https://ssvid.net',

  baseHeaders: {
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    origin: 'https://ssvid.net',
    referer: 'https://ssvid.net/youtube-to-mp3'
  },

  validateFormat(userFormat) {
    const validFormat = ['mp3', '360p', '720p', '1080p'];
    if (!validFormat.includes(userFormat)) {
      throw new Error(`invalid format! available formats: ${validFormat.join(', ')}`);
    }
  },

  handleFormat(userFormat, searchJson) {
    this.validateFormat(userFormat);
    let result;
    if (userFormat === 'mp3') {
      result = searchJson.links?.mp3?.mp3128?.k;
    } else {
      let selectedFormat;
      const allFormats = Object.entries(searchJson.links.mp4);

      const quality = allFormats
        .map(v => v[1].q)
        .filter(v => /\d+p/.test(v))
        .map(v => parseInt(v))
        .sort((a, b) => b - a)
        .map(v => v + 'p');

      if (!quality.includes(userFormat)) {
        selectedFormat = quality[0];
        console.log(`⚠️ format ${userFormat} gak ada. fallback ke ${selectedFormat}`);
      } else {
        selectedFormat = userFormat;
      }

      const find = allFormats.find(v => v[1].q === selectedFormat);
      result = find?.[1]?.k;
    }
    if (!result) throw new Error(`${userFormat} gak ada cuy`);
    return result;
  },

  async hit(path, payload) {
    try {
      const body = new URLSearchParams(payload);
      const opts = { headers: this.baseHeaders, body, method: 'post' };
      const r = await fetch(`${this.baseUrl}${path}`, opts);
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}\n${await r.text()}`);
      return await r.json();
    } catch (e) {
      throw new Error(`${path}\n${e.message}`);
    }
  },

  async download(queryOrYtUrl, userFormat = 'mp3') {
    this.validateFormat(userFormat);

    // first hit
    let search = await this.hit('/api/ajax/search', {
      query: queryOrYtUrl,
      cf_token: '',
      vt: 'youtube'
    });

    if (search.p === 'search') {
      if (!search?.items?.length) throw new Error(`hasil pencarian ${queryOrYtUrl} tidak ada`);
      const { v } = search.items[0];
      const videoUrl = 'https://www.youtube.com/watch?v=' + v;

      // hit lagi
      search = await this.hit('/api/ajax/search', {
        query: videoUrl,
        cf_token: '',
        vt: 'youtube'
      });
    }

    const vid = search.vid;
    const k = this.handleFormat(userFormat, search);

    // convert
    const convert = await this.hit('/api/ajax/convert', { k, vid });

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
        await new Promise(re => setTimeout(re, 5000));
      } while (attempt < limit && convert2.c_status === 'CONVERTING');
      throw new Error('file belum siap / status belum diketahui');
    } else {
      return convert;
    }
  }
};

// ==== versi Express API ====
module.exports = function (app) {
  // Endpoint MP3
  app.get('/api/ytmp3', async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'Danz-dev',
        error: 'Parameter ?url= diperlukan'
      });
    }

    try {
      const result = await yt.download(url, 'mp3');
      return res.json({
        status: true,
        creator: 'Danz-dev',
        result
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        creator: 'Danz-dev',
        error: err.message
      });
    }
  });

  // Endpoint MP4 (default 720p)
  app.get('/api/ytmp4', async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'Danz-dev',
        error: 'Parameter ?url= diperlukan'
      });
    }

    try {
      const result = await yt.download(url, '720p');
      return res.json({
        status: true,
        creator: 'Danz-dev',
        result
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        creator: 'Danz-dev',
        error: err.message
      });
    }
  });
};
