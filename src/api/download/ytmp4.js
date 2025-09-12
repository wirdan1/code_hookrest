const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = function (app) {
  app.get('/dl/yt', async (req, res) => {
    const youtubeUrl = req.query.url;
    if (!youtubeUrl) {
      return res.status(400).json({
        status: false,
        creator: 'Danz-dev',
        error: 'Parameter ?url= diperlukan',
      });
    }

    try {
      console.log('📡 Mengirim URL ke API:', youtubeUrl);

      // Kirim request ke API pihak ketiga
      const response = await axios.post(
        'https://yt.savetube.me/api/download',
        { url: youtubeUrl },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const data = response.data;
      const downloadLink =
        data?.downloadLink || data?.result?.[0]?.url || null;

      if (!downloadLink) {
        throw new Error(
          'Link download tidak ditemukan. Respons asli: ' +
            JSON.stringify(data)
        );
      }

      console.log('✅ Link download ditemukan:', downloadLink);

      // Tentukan nama file output
      const outputDir = path.resolve('./downloads');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
      }
      const fileName = `ytshorts_${Date.now()}.mp4`;
      const fullPath = path.join(outputDir, fileName);

      // Download video
      const fileResponse = await axios({
        url: downloadLink,
        method: 'GET',
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(fullPath);
      fileResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`🎉 Video berhasil disimpan: ${fullPath}`);

      return res.json({
        status: true,
        creator: 'Danz-dev',
        result: {
          file: fileName,
          path: `/downloads/${fileName}`, // bisa dipakai untuk serve file statis
        },
      });
    } catch (error) {
      console.error('❌ Error:', error.message);
      return res.status(500).json({
        status: false,
        creator: 'Danz-dev',
        error: error.message,
      });
    }
  });
};
