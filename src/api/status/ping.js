const os = require('os');

module.exports = function(app) {
    function formatBytes(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Byte';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
        return `${(bytes / (1024 ** i)).toFixed(2)} ${sizes[i]}`;
    }

    app.get('/api/status', async (req, res) => {
        try {
            const uptime = os.uptime();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            let currentUser = 'Unknown';

            try {
                currentUser = os.userInfo().username;
            } catch (e) {
                currentUser = 'Unavailable';
            }

            res.status(200).json({
                status: true,
                result: {
                    hostname: os.hostname(),
                    osType: os.type(),
                    platform: os.platform(),
                    arch: os.arch(),
                    release: os.release(),
                    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
                    cpuModel: os.cpus()[0].model,
                    cpuCores: os.cpus().length,
                    loadAverage: os.loadavg(), // [1min, 5min, 15min]
                    totalMemory: formatBytes(totalMem),
                    usedMemory: formatBytes(usedMem),
                    freeMemory: formatBytes(freeMem),
                    nodeVersion: process.version,
                    currentUser
                }
            });
        } catch (err) {
            res.status(500).json({ status: false, error: err.message });
        }
    });
};
