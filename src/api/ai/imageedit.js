const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");

function generateFakeIpHeaders() {
  const ipv4 = `${Math.floor(Math.random() * 255)}.${Math.floor(
    Math.random() * 255
  )}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  return {
    "X-Forwarded-For": ipv4,
    "X-Originating-IP": ipv4,
    "X-Remote-IP": ipv4,
    "X-Real-IP": ipv4,
    "Client-IP": ipv4,
    "CF-Connecting-IP": ipv4,
    Forwarded: `for=${ipv4};proto=http;by=${ipv4}`,
  };
}

module.exports = function (app) {
  const jar = new CookieJar();
  const api = wrapper(
    axios.create({
      baseURL: "https://nanobanana.ai",
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,id;q=0.8",
        "content-type": "application/json",
        origin: "https://nanobanana.ai",
        referer: "https://nanobanana.ai/",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
        ...generateFakeIpHeaders(),
      },
      jar,
      withCredentials: true,
    })
  );

  async function initSession() {
    await api.get("/api/auth/session");
  }

  async function getUploadUrl(fileBuffer, filename = "upload.jpg") {
    const res = await api.post("/api/get-upload-url", {
      fileName: filename,
      contentType: "image/jpeg",
      fileSize: fileBuffer.length,
    });
    return res.data;
  }

  async function uploadFile(uploadUrl, fileBuffer) {
    await axios.put(uploadUrl, fileBuffer, {
      headers: { "content-type": "image/jpeg" },
    });
  }

  async function generateImage(prompt, styleId, publicUrl) {
    const res = await api.post("/api/generate-image", {
      prompt,
      styleId,
      mode: "image",
      imageUrl: publicUrl,
      imageUrls: [publicUrl],
    });
    return res.data;
  }

  async function checkStatus(taskId) {
    const res = await api.get("/api/generate-image/status", {
      params: { taskId },
    });
    return res.data;
  }

  async function waitForResult(taskId, interval = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const status = await checkStatus(taskId);
          if (status.status === "completed") {
            clearInterval(timer);
            resolve(status);
          } else if (status.status === "failed") {
            clearInterval(timer);
            reject(new Error("Task failed"));
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, interval);
    });
  }

  // 🔹 Endpoint: prompt + imageUrl
  app.get("/api/nanobanana", async (req, res) => {
    const { imageUrl, prompt, style } = req.query;
    if (!imageUrl) {
      return res
        .status(400)
        .json({ status: false, error: 'Parameter "imageUrl" diperlukan' });
    }

    try {
      await initSession();

      // ambil gambar dari url
      const imgResp = await axios.get(imageUrl, { responseType: "arraybuffer" });
      const fileBuffer = Buffer.from(imgResp.data);

      // dapatkan uploadUrl
      const { uploadUrl, publicUrl } = await getUploadUrl(fileBuffer, "input.jpg");

      // upload gambar
      await uploadFile(uploadUrl, fileBuffer);

      // generate task
      const task = await generateImage(
        prompt || "default prompt",
        style || "realistic",
        publicUrl
      );

      // tunggu hasil
      const result = await waitForResult(task.taskId);

      res.json({
        status: true,
        creator: "Danz-dev",
        result,
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: "Danz-dev",
        error: err.message,
      });
    }
  });
};
