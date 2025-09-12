const yts = require("yt-search");
const https = require("https");
const { URLSearchParams } = require("url");

function fetchJson(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: options.method || "GET",
            headers: options.headers || {}
        }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error("Gagal parse JSON: " + e.message + "\n" + data));
                }
            });
        });
        req.on("error", reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

const ssvid = {
    baseUrl: "https://ssvid.net",
    baseHeaders: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://ssvid.net",
        referer: "https://ssvid.net/youtube-to-mp3"
    },

    async hit(path, payload) {
        const body = new URLSearchParams(payload).toString();
        return fetchJson(this.baseUrl + path, {
            method: "POST",
            headers: this.baseHeaders,
            body
        });
    },

    async download(queryOrUrl, format = "mp3") {
        let search = await this.hit("/api/ajax/search", {
            query: queryOrUrl,
            cf_token: "",
            vt: "youtube"
        });

        if (search.p === "search") {
            if (!search?.items?.length) throw new Error(`Hasil pencarian tidak ada`);
            const { v } = search.items[0];
            const videoUrl = "https://www.youtube.com/watch?v=" + v;

            search = await this.hit("/api/ajax/search", {
                query: videoUrl,
                cf_token: "",
                vt: "youtube"
            });
        }

        const vid = search.vid;
        let key;

        if (format === "mp3") {
            key = search.links?.mp3?.mp3128?.k;
        } else {
            const allFormats = Object.entries(search.links.mp4);
            const find = allFormats.find(v => v[1].q === format);
            key = find?.[1]?.k;
        }

        if (!key) throw new Error(`Format ${format} gak tersedia`);

        const convert = await this.hit("/api/ajax/convert", { k: key, vid });

        if (convert.c_status === "CONVERTING") {
            let convert2;
            const limit = 5;
            let attempt = 0;
            do {
                attempt++;
                convert2 = await this.hit("/api/convert/check?hl=en", {
                    vid,
                    b_id: convert.b_id
                });
                if (convert2.c_status === "CONVERTED") return convert2;
                await new Promise(r => setTimeout(r, 5000));
            } while (attempt < limit && convert2.c_status === "CONVERTING");
            throw new Error("File belum siap / status belum diketahui");
        } else {
            return convert;
        }
    }
};

module.exports = function(app) {
    app.get("/dl/yt/play", async (req, res) => {
        const { query } = req.query;
        if (!query) return res.status(400).json({ status: false, error: "Parameter 'query' diperlukan" });

        try {
            // Cari video pertama via yt-search
            const searchResult = await yts(query);
            const video = searchResult.videos[0];
            if (!video) return res.status(404).json({ status: false, error: "Video tidak ditemukan" });

            // Download MP3 via ssvid
            const mp3 = await ssvid.download(video.url, "mp3");

            res.json({
                status: true,
                creator: "Danz-dev",
                result: {
                    video: {
                        url: video.url,
                        title: video.title,
                        description: video.description,
                        duration: video.timestamp,
                        views: video.views,
                        thumbnail: video.thumbnail
                    },
                    mp3: {
                        title: mp3.title || video.title,
                        dlink: mp3.dlink,
                        ftype: mp3.ftype,
                        fquality: mp3.fquality
                    }
                }
            });
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
