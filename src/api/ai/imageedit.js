const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

module.exports = function (app) {
  const BASE_URL = "https://ai-apps.codergautam.dev";

  function acakName(len = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  // Registrasi otomatis user baru
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
    throw new Error("Register gagal: " + JSON.stringify(res.data));
  }

  // Proses img2img
  async function img2img(imageUrl, prompt, pollInterval = 3000, pollTimeout = 2 * 60 * 1000) {
    const uid = await autoregist();

    // Ambil gambar dari URL
    const imageBuffer = (await axios.get(imageUrl, { responseType: "arraybuffer" })).data;

    const form = new FormData();
    form.append("image", imageBuffer, {
      filename: "input.jpg",
      contentType: "image/jpeg"
    });
    form.append("prompt", prompt || "anime style");
    form.append("userId", uid);

    const uploadRes = await axios.post(`${BASE_URL}/photogpt/generate-image`, form, {
      headers: {
        ...form.getHeaders(),
        "accept": "application/json",
        "user-agent": "okhttp/4.9.2",
        "accept-encoding": "gzip"
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000
    });

    if (!uploadRes.data.success) throw new Error(JSON.stringify(uploadRes.data));

    // Ambil pollingUrl atau fallback ke jobId
    const pollingUrl =
      uploadRes.data.pollingUrl ||
      (uploadRes.data.jobId ? `${BASE_URL}/photogpt/job/${uploadRes.data.jobId}` : null);

    if (!pollingUrl) throw new Error("Polling URL tidak ditemukan.");

    let status = "pending";
    let resultUrl = null;
    const startTime = Date.now();

    while (true) {
      if (Date.now() - startTime > pollTimeout) {
        throw new Error("Polling timeout, coba lagi.");
      }

      const pollRes = await axios.get(pollingUrl, {
        headers: {
          "accept": "application/json",
          "user-agent": "okhttp/4.9.2",
          "accept-encoding": "gzip"
        }
      });

      status = (pollRes.data.status || "").toLowerCase();

      if (["ready", "complete", "success"].includes(status)) {
        resultUrl = pollRes.data.result?.url || pollRes.data.url;
        break;
      }

      await new Promise(r => setTimeout(r, pollInterval));
    }

    if (!resultUrl) throw new Error("Job selesai tapi URL gambar tidak ditemukan.");

    const resultImg = await axios.get(resultUrl, { responseType: "arraybuffer" });
    return Buffer.from(resultImg.data);
  }

  // Endpoint Express
  app.get("/api/photogpt", async (req, res) => {
    const { imageUrl, prompt } = req.query;
    if (!imageUrl) {
      return res.status(400).json({ status: false, error: 'Parameter "imageUrl" diperlukan' });
    }

    try {
      const buffer = await img2img(imageUrl, prompt);
      res.setHeader("Content-Type", "image/jpeg");
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ status: false, creator: "Danz-dev", error: err.message });
    }
  });
};
