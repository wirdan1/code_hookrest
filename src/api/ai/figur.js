const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

module.exports = function (app) {
  const BASE_URL = "https://ai-apps.codergautam.dev";

  // daftar prompt fixed
  const PROMPTS = [
    `Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style and a realistic environment. The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base. The computer screen shows the Zbrush modeling process of the figurine. Next to the computer screen is a BANDAI-style toy box with the original painting printed on it.`,
    `Using the nano-banana model, a commercial 1/7 scale figurine of the character in the picture was created, depicting a realistic style with high-quality painting and detailed sculpt. The figurine is placed on a computer desk with a round transparent acrylic base. There is no text on the base. On the monitor behind it, the Blender 3D modeling process of the figurine is displayed with both wireframe and shaded views. Next to the monitor is a premium toy box designed like a collector’s edition package, with the character artwork and a transparent plastic window showing the figurine inside.`
  ];

  // fungsi acak nama
  function acakName(len = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  // auto registrasi user
  async function autoregist() {
    const uid = crypto.randomBytes(12).toString("hex");
    const email = `gienetic${Date.now()}@nyahoo.com`;

    const payload = {
      uid,
      email,
      displayName: acakName(),
      photoURL: "https://i.pravatar.cc/150",
      appId: "photogpt"
    };

    const res = await axios.post(`${BASE_URL}/photogpt/create-user`, payload, {
      headers: {
        "content-type": "application/json",
        "accept": "application/json",
        "user-agent": "okhttp/4.9.2"
      }
    });

    if (res.data.success) return uid;
    throw new Error("Register gagal cuy: " + JSON.stringify(res.data));
  }

  // fungsi utama
  async function figurimage(imageUrl) {
    const uid = await autoregist();

    // acak prompt
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

    const form = new FormData();
    form.append("image", (await axios.get(imageUrl, { responseType: "arraybuffer" })).data, {
      filename: "input.jpg",
      contentType: "image/jpeg"
    });
    form.append("prompt", prompt);
    form.append("userId", uid);

    const uploadRes = await axios.post(`${BASE_URL}/photogpt/generate-image`, form, {
      headers: {
        ...form.getHeaders(),
        "accept": "application/json",
        "user-agent": "okhttp/4.9.2",
        "accept-encoding": "gzip"
      }
    });

    if (!uploadRes.data.success) throw new Error(JSON.stringify(uploadRes.data));

    const { pollingUrl } = uploadRes.data;
    let status = "pending";
    let resultUrl = null;

    while (status !== "Ready") {
      const pollRes = await axios.get(pollingUrl, {
        headers: { "accept": "application/json", "user-agent": "okhttp/4.9.2" }
      });
      status = pollRes.data.status;
      if (status === "Ready") {
        resultUrl = pollRes.data.result.url;
        break;
      }
      await new Promise(r => setTimeout(r, 3000));
    }

    if (!resultUrl) throw new Error("Gagal mendapatkan hasil gambar.");

    const resultImg = await axios.get(resultUrl, { responseType: "arraybuffer" });
    return Buffer.from(resultImg.data);
  }

  // endpoint express
  app.get("/api/figurimage", async (req, res) => {
    const { imageUrl } = req.query;
    if (!imageUrl) return res.status(400).json({ status: false, error: 'Parameter "imageUrl" diperlukan' });

    try {
      const imgBuffer = await figurimage(imageUrl);
      res.setHeader("Content-Type", "image/jpeg");
      res.send(imgBuffer);
    } catch (err) {
      res.status(500).json({ status: false, error: err.message });
    }
  });
};
