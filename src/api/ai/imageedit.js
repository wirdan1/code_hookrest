const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const { fromBuffer } = require('file-type'); // npm install file-type

let apikeylist = [
    'AIzaSyC6qS92nTBWF68ypa2Oj9VFBlFVYfJXtvM',
    'AIzaSyCngQOmF3ggnlVfJgc3o2GJ2u8ywMx96IU'
];

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = function (app) {
    app.post('/ai/imageedit', async (req, res) => {
        try {
            const { prompt, imageUrl } = req.body;

            if (!prompt || !imageUrl || !imageUrl.startsWith("https://")) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "prompt" dan "imageUrl" (harus https://) diperlukan.'
                });
            }

            // Ambil API key random
            const apikeygemini = pickRandom(apikeylist);

            // Ambil buffer gambar dari URL
            const buffer = await axios.get(imageUrl, { responseType: 'arraybuffer' }).then(r => r.data);

            // Deteksi mime type
            const { mime } = await fromBuffer(buffer);
            if (!/image/.test(mime)) {
                return res.status(400).json({
                    status: false,
                    error: 'URL yang diberikan bukan file gambar.'
                });
            }

            // Inisialisasi Gemini
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
                generationConfig: {
                    responseModalities: ["Text", "Image"]
                }
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
                    error: "Tidak ada gambar yang dihasilkan oleh Gemini."
                });
            }

            // Kirim gambar langsung sebagai response
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': resultImage.length,
            });
            res.end(resultImage);

        } catch (err) {
            res.status(500).json({
                status: false,
                error: err.message || 'Terjadi kesalahan internal.'
            });
        }
    });
};
