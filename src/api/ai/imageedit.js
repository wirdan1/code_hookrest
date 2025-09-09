const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const { fromBuffer } = require('file-type'); // pastikan sudah install: npm install file-type

let apikeylist = [
    'AIzaSyC6qS92nTBWF68ypa2Oj9VFBlFVYfJXtvM',
    'AIzaSyCngQOmF3ggnlVfJgc3o2GJ2u8ywMx96IU'
];

module.exports = function(app) {
    // Endpoint untuk edit gambar dengan Gemini
    app.post('/ai/imageedit', async (req, res) => {
        try {
            const { prompt, imageUrl } = req.body;

            if (!prompt || !imageUrl || !imageUrl.includes('https://')) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter prompt dan imageUrl (https://) wajib diisi'
                });
            }

            let apikeygemini = pickRandom(apikeylist);

            // Ambil gambar source
            const buffer = await axios.get(imageUrl, { responseType: 'arraybuffer' }).then(r => r.data);

            const { mime } = await fromBuffer(buffer);
            if (!/image/.test(mime)) {
                return res.status(400).json({
                    status: false,
                    error: 'File yang diberikan bukan gambar!'
                });
            }

            const genAI = new GoogleGenerativeAI(apikeygemini);
            const base64Image = buffer.toString("base64");

            const contents = [
                { text: prompt },
                {
                    inlineData: {
                        mimeType: mime,
                        data: base64Image
                    }
                }
            ];

            const model = genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp-image-generation",
                generationConfig: { responseModalities: ["Text", "Image"] }
            });

            const responseGemini = await model.generateContent(contents);

            let resultImage = null;
            let resultText = "";

            for (const part of responseGemini.response.candidates[0].content.parts) {
                if (part.text) {
                    resultText += part.text;
                } else if (part.inlineData) {
                    resultImage = Buffer.from(part.inlineData.data, "base64");
                }
            }

            if (!resultImage) {
                return res.status(500).json({
                    status: false,
                    error: "Tidak ada gambar yang dihasilkan."
                });
            }

            // Kirim gambar langsung ke client
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': resultImage.length,
            });
            res.end(resultImage);

        } catch (e) {
            res.status(500).json({
                status: false,
                message: e.message || e
            });
        }
    });
};

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
