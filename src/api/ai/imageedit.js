const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

module.exports = function (app) {
  const BASE_URL = "https://ai-apps.codergautam.dev";

  function acakName(len = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

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

  async function img2img(imageUrl, prompt) {
    const uid = await autoregist();

    const form = new FormData();
    form.append("image", (await axios.get(imageUrl, { responseType: "arraybuffer" })).data, {
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

  // Endpoint
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
