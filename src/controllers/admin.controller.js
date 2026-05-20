// controllers/server.controller.js

const os = require('os');
const { execFile } = require('child_process');
const { success } = require('../utils/response');
const { getConnectedCount } = require('../sockets/index');
// ── DASHBOARD STATS ───────────────────────────────────────────
const User = require('../models/User');
const Message = require('../models/Message');
const CallLog = require('../models/CallLog');
const Report = require('../models/Report');


// ── CONFIG ────────────────────────────────────────────────────
const INTERVAL_MS = 2.5 * 60 * 1000;
const HISTORY_SIZE = 576;
const LIVE_INTERVAL_MS = 10_000;

// ── ESTADO GLOBAL ─────────────────────────────────────────────
let lastCpuUsage = process.cpuUsage();
let lastCpuUsageLive = process.cpuUsage();
let eventLoopLag = '0';
let totalInBytes = 0, totalOutBytes = 0;
let lastInBytes = 0, lastOutBytes = 0;

const metricsHistory = [];
const sseClients = new Set();

// ── DISK ──────────────────────────────────────────────────────
async function getDiskUsage() {
    // Windows (desarrollo local)
    if (os.platform() === 'win32') {
        return new Promise((resolve) => {
            execFile(
                'powershell',
                ['-NoProfile', '-Command',
                    'Get-PSDrive C | ForEach-Object { ' +
                    'if ($_.Free -ne $null) { ' +
                    '[math]::Round($_.Used / ($_.Used + $_.Free) * 100, 2) } else { 0 } }'
                ],
                { timeout: 5000 },
                (err, stdout) => {
                    if (err) return resolve('0');
                    const use = parseFloat(stdout.trim());
                    resolve(isNaN(use) ? '0' : use.toFixed(2));
                }
            );
        }).catch(() => '0');
    }

    // Linux / Render
    return new Promise((resolve) => {
        execFile('df', ['-k', '/'], { timeout: 3000 }, (err, stdout) => {
            if (err) return resolve('0');
            const lines = stdout.trim().split('\n');
            const parts = lines[1]?.split(/\s+/);
            if (!parts || parts.length < 5) return resolve('0');
            const use = parseFloat(parts[4]); // parseFloat("42%") → 42
            resolve(isNaN(use) ? '0' : use.toFixed(2));
        });
    }).catch(() => '0');
}

// ── HELPERS ───────────────────────────────────────────────────
function getMemorySnapshot() {
    const m = process.memoryUsage();
    const mb = (n) => (n / 1024 / 1024).toFixed(2);
    return {
        rss: mb(m.rss),
        heapUsed: mb(m.heapUsed),
        heapTotal: mb(m.heapTotal),
        external: mb(m.external),
    };
}

function broadcast(payload) {
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of sseClients) {
        if (client.writableEnded) { sseClients.delete(client); continue; }
        try { client.write(data); }
        catch { sseClients.delete(client); }
    }
}

// ── HISTÓRICO SIMULADO ────────────────────────────────────────
// Un punto por hora transcurrida hoy — coincide con la granularidad
// del gráfico y evita generar ~230 puntos innecesarios al arrancar.
function generateSimulatedHistory() {
    const now = Date.now();
    const midnight = new Date().setHours(0, 0, 0, 0);
    const hoursElapsed = Math.floor((now - midnight) / (60 * 60 * 1000));

    // Si es la primera hora, genera al menos 1 punto simulado
    const points = Math.max(hoursElapsed, 1);

    for (let i = points; i > 0; i--) {
        metricsHistory.push({
            timestamp: now - i * 60 * 60 * 1000,
            simulated: true,
            cpu: (Math.random() * 30 + 5).toFixed(2),
            ram: {
                rss: (Math.random() * 200 + 100).toFixed(2),
                heapUsed: (Math.random() * 100 + 50).toFixed(2),
                heapTotal: (Math.random() * 150 + 80).toFixed(2),
                external: (Math.random() * 10 + 1).toFixed(2),
            },
            disk: (Math.random() * 20 + 10).toFixed(2),
            network: { in: '0.0000', out: '0.0000' },
            eventLoopLag: (Math.random() * 2).toFixed(2),
        });
    }
}

generateSimulatedHistory();

// ── RESET DIARIO ──────────────────────────────────────────────
function scheduleReset() {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    setTimeout(() => {
        console.log('🌙 Reiniciando histórico');
        metricsHistory.length = 0;
        generateSimulatedHistory();
        scheduleReset();
    }, midnight - Date.now());
}
scheduleReset();

// ── LIVE METRICS (cada 10 s) ──────────────────────────────────
setInterval(async () => {
    const currentCpu = process.cpuUsage(lastCpuUsageLive);
    const cpu = ((currentCpu.user + currentCpu.system) / (LIVE_INTERVAL_MS * 1000) * 100).toFixed(2);
    lastCpuUsageLive = process.cpuUsage();

    broadcast({
        type: 'live',
        timestamp: Date.now(),
        cpu,
        ram: getMemorySnapshot(),
        disk: await getDiskUsage(),
        network: metricsHistory.at(-1)?.network ?? { in: '0.0000', out: '0.0000' },
        eventLoopLag,
    });
}, LIVE_INTERVAL_MS);

// ── HISTÓRICO (cada 2.5 min) ──────────────────────────────────
setInterval(async () => {
    const currentCpu = process.cpuUsage(lastCpuUsage);
    const cpu = ((currentCpu.user + currentCpu.system) / (INTERVAL_MS * 1000) * 100).toFixed(2);
    lastCpuUsage = process.cpuUsage();

    const inDiff = totalInBytes - lastInBytes;
    const outDiff = totalOutBytes - lastOutBytes;
    lastInBytes = totalInBytes;
    lastOutBytes = totalOutBytes;

    const snapshot = {
        timestamp: Date.now(),
        simulated: false,
        cpu,
        ram: getMemorySnapshot(),
        disk: await getDiskUsage(),
        network: {
            in: (inDiff / 1024 / 1024 / (INTERVAL_MS / 1000)).toFixed(4),
            out: (outDiff / 1024 / 1024 / (INTERVAL_MS / 1000)).toFixed(4),
        },
        eventLoopLag,
    };

    metricsHistory.push(snapshot);
    if (metricsHistory.length > HISTORY_SIZE) metricsHistory.shift();
    broadcast(snapshot);
}, INTERVAL_MS);

// ── EVENT LOOP LAG ────────────────────────────────────────────
setInterval(() => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
        eventLoopLag = (Number(process.hrtime.bigint() - start) / 1e6).toFixed(2);
    });
}, 1000);

// ── TRAFFIC MIDDLEWARE ────────────────────────────────────────
exports.trafficMiddleware = (req, res, next) => {
    let inBytes = 0;
    req.on('data', (chunk) => { inBytes += chunk.length; });
    req.on('end', () => { totalInBytes += inBytes; });

    let outgoing = 0;
    const { write: origWrite, end: origEnd } = res;

    res.write = function (chunk, ...args) {
        if (chunk) outgoing += Buffer.byteLength(chunk);
        return origWrite.apply(this, [chunk, ...args]);
    };
    res.end = function (chunk, ...args) {
        if (chunk) outgoing += Buffer.byteLength(chunk);
        totalOutBytes += outgoing;
        return origEnd.apply(this, [chunk, ...args]);
    };

    next();
};

// ── CONTROLLERS ───────────────────────────────────────────────
exports.getHistory = (req, res, next) => {
    try {
        return success(res, { metrics: metricsHistory }, 200);
    } catch (err) { next(err); }
};

exports.streamMetrics = (req, res, next) => {
    try {
        req.socket.setKeepAlive(true);
        req.socket.setTimeout(0);
        res.setTimeout(0);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.flushHeaders();

        sseClients.add(res);
        res.write(`data: ${JSON.stringify({ history: metricsHistory })}\n\n`);

        console.log(`✅ SSE cliente agregado — total: ${sseClients.size}`);

        const heartbeat = setInterval(() => {
            if (res.writableEnded) { clearInterval(heartbeat); sseClients.delete(res); return; }
            try { res.write(': ping\n\n'); }
            catch { clearInterval(heartbeat); sseClients.delete(res); }
        }, 15_000);

        res.on('close', () => {
            clearInterval(heartbeat);
            sseClients.delete(res);
            console.log(`❌ SSE cliente desconectado — total: ${sseClients.size}`);
        });

    } catch (err) { next(err); }
};

// Agrega esto al final de server.controller.js


function getDayRange(daysAgo = 0) {
    const start = new Date();
    start.setDate(start.getDate() - daysAgo);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function growthPercent(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(1));
}

exports.getDashboardStats = async (req, res, next) => {
    try {
        const today = getDayRange(0);
        const yesterday = getDayRange(1);

        const [
            totalUsers,
            totalUsersYesterday,
            activeUsers,
            activeUsersYesterday,
            messagesToday,
            messagesYesterday,
            callsToday,
            callsYesterday,
            pendingReports,
            voiceMinutes,
            videoMinutes,
        ] = await Promise.all([
            User.countDocuments({ createdAt: { $lte: today.end } }),
            User.countDocuments({ createdAt: { $lte: yesterday.end } }),

            User.countDocuments({
                status: 'active',
                lastSeenAt: { $gte: today.start, $lte: today.end },
            }),
            User.countDocuments({
                status: 'active',
                lastSeenAt: { $gte: yesterday.start, $lte: yesterday.end },
            }),

            Message.countDocuments({
                isDeleted: false,
                createdAt: { $gte: today.start, $lte: today.end },
            }),
            Message.countDocuments({
                isDeleted: false,
                createdAt: { $gte: yesterday.start, $lte: yesterday.end },
            }),

            CallLog.countDocuments({
                startedAt: { $gte: today.start, $lte: today.end },
            }),
            CallLog.countDocuments({
                startedAt: { $gte: yesterday.start, $lte: yesterday.end },
            }),

            Report.countDocuments({ status: 'pending' }),

            // Suma de durationSeconds de llamadas voice hoy → convertir a minutos
            CallLog.aggregate([
                {
                    $match: {
                        type: 'voice',
                        startedAt: { $gte: today.start, $lte: today.end },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$durationSeconds' },
                    },
                },
            ]),

            // Ídem para video
            CallLog.aggregate([
                {
                    $match: {
                        type: 'video',
                        startedAt: { $gte: today.start, $lte: today.end },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$durationSeconds' },
                    },
                },
            ]),
        ]);

        // aggregate devuelve array — si no hay llamadas el array está vacío
        const voiceMinutesTotal = voiceMinutes[0]?.total ?? 0;
        const videoMinutesTotal = videoMinutes[0]?.total ?? 0;
        return success(res, {
            users: {
                total: totalUsers,
                growth: growthPercent(totalUsers, totalUsersYesterday),
            },
            activeUsers: {
                total: getConnectedCount(),
                growth: null,
            },
            messages: {
                total: messagesToday,
                growth: growthPercent(messagesToday, messagesYesterday),
            },
            calls: {
                total: callsToday,
                growth: growthPercent(callsToday, callsYesterday),
            },
            reports: {
                pending: pendingReports,
            },
            callMinutes: {
                voice: voiceMinutesTotal,
                video: videoMinutesTotal,
            },
        }, 200);

    } catch (err) {
        next(err);
    }
};


// ── PROVIDER METRICS ──────────────────────────────────────────
const ProviderMetric = require('../models/ProviderMetric');

exports.getProviderMetrics = async (req, res, next) => {
    try {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        since.setHours(0, 0, 0, 0);

        const metrics = await ProviderMetric.find({
            provider: 'twilio',
            periodStart: { $gte: since },
        }).sort({ periodStart: 1 });

        const data = metrics.map(m => ({
            date: m.periodStart.toISOString().split('T')[0], // "2026-05-11"
            voiceMinutes: m.voiceMinutes,
            videoMinutes: m.videoMinutes,
            smsCount: m.smsCount,
        }));

        return success(res, { metrics: data }, 200);
    } catch (err) {
        next(err);
    }
};

exports.getServerStats = (req, res, next) => {
    try {
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const last24h = metricsHistory.filter((m) => m.timestamp >= since);
        return success(res, { metrics: last24h }, 200);
    } catch (err) { next(err); }
};


exports.getReports = async (req, res, next) => {
    try {
        const reports = await Report.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .populate('messageId')
            .lean();

        const userIds = [...new Set(
            reports.flatMap(r => [r.reportedUserId, r.reporterUserId])
        )];

        const users = await User.find({ _id: { $in: userIds } })
            .select('_id username')
            .lean();

        const userMap = Object.fromEntries(users.map(u => [u._id, u.username]));

        const data = reports.map(r => ({
            id: r._id,
            reportado: userMap[r.reportedUserId] ?? r.reportedUserId,
            reporta: userMap[r.reporterUserId] ?? r.reporterUserId,
            media: r.messageId?.type ?? 'text',
            mensaje: r.messageId?.content ?? null,
            mediaUrl: r.messageId?.mediaUrl ?? null,
            fecha: new Date(r.createdAt).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
            }),
            status: r.status,
        }));

        return success(res, { reports: data }, 200);
    } catch (err) {
        next(err);
    }
};


exports.resolveReport = async (req, res, next) => {
    try {
        const { id } = req.params;

        const report = await Report.findById(id);
        if (!report) return next({ status: 404, message: 'Reporte no encontrado' });

        // Marcar reporte como resuelto
        await Report.findByIdAndUpdate(id, {
            status: 'resolved',
            reviewedAt: new Date(),
        });

        // Obtener usuario reportado y sumar strike
        const user = await User.findById(report.reportedUserId);
        if (!user) return success(res, { message: 'Reporte resuelto (usuario no encontrado)' }, 200);

        const newStrikes = user.strikes + 1;
        const update = { strikes: newStrikes };

        if (newStrikes === 1) {
            // 1er strike — solo advertencia, sin suspensión
            update.status = 'active';
            update.suspensionUntil = null;
        } else if (newStrikes === 2) {
            // 2do strike — suspensión 24h
            const until = new Date();
            until.setHours(until.getHours() + 24);
            update.status = 'suspended';
            update.suspensionUntil = until;
        } else {
            // 3er strike o más — suspensión permanente
            update.status = 'blocked';
            update.suspensionUntil = new Date('3000-01-01T00:00:00.000Z');
        }

        await User.findByIdAndUpdate(report.reportedUserId, update);

        return success(res, {
            message: 'Reporte resuelto',
            strikes: newStrikes,
            status: update.status,
        }, 200);

    } catch (err) { next(err); }
};

exports.dismissReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        await Report.findByIdAndUpdate(id, {
            status: 'dismissed',
            reviewedAt: new Date(),
        });
        return success(res, { message: 'Reporte descartado' }, 200);
    } catch (err) { next(err); }
};


exports.getCallLogs = async (req, res, next) => {
    try {
        const logs = await CallLog.find()
            .sort({ startedAt: -1 })
            .limit(100)
            .lean();

        const userIds = [...new Set(
            logs.flatMap(l => [l.fromUserId, l.toUserId])
        )];

        const users = await User.find({ _id: { $in: userIds } })
            .select('_id username')
            .lean();

        const userMap = Object.fromEntries(users.map(u => [u._id, u.username]));

        const formatDuration = (secs) => {
            if (!secs) return null;
            const m = Math.floor(secs / 60);
            const s = String(secs % 60).padStart(2, '0');
            return `${m}:${s}`;
        };

        const data = logs.map(l => ({
            id: l._id,
            llamante: userMap[l.fromUserId] ?? l.fromUserId,
            receptor: userMap[l.toUserId] ?? l.toUserId,
            tipo: l.type === 'voice' ? 'Audio' : 'Video',
            duracion: formatDuration(l.durationSeconds),
            fecha: new Date(l.startedAt).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            }),
        }));

        return success(res, { logs: data }, 200);
    } catch (err) { next(err); }
};


exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find()
            .select('_id username email strikes status suspensionUntil lastSeenAt avatarUrl')
            .sort({ createdAt: -1 })
            .lean();

        const statusLabel = (u) => {
            if (u.status === 'blocked') return 'Bloqueado';
            if (u.status === 'suspended') return 'Suspendido';
            return 'Activo';
        };

        const data = users.map(u => ({
            id: u._id,
            username: u.username,
            email: u.email,
            strikes: u.strikes,
            estado: statusLabel(u),
            ultimoAcceso: new Date(u.lastSeenAt).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            }),
            avatar: u.avatarUrl ?? null,
        }));

        return success(res, { users: data }, 200);
    } catch (err) { next(err); }
};

exports.reactivateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        await User.findByIdAndUpdate(id, {
            status: 'active',
            suspensionUntil: null,
            strikes: 0
        });
        return success(res, { message: 'Usuario reactivado' }, 200);
    } catch (err) { next(err); }
};