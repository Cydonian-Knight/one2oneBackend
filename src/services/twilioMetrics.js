const ProviderMetric = require('../models/ProviderMetric');
const CallLog = require('../models/CallLog');

const PRICE_PER_VOICE_MIN = 0.013;
const PRICE_PER_VIDEO_MIN = 0.004;

async function seedTwilioHistory() {
    try {
        const anyHistoric = await ProviderMetric.findOne({
            provider: 'twilio',
            periodStart: { $lt: new Date().setHours(0, 0, 0, 0) },
        });
        if (anyHistoric) {
            console.log('📊 Histórico Twilio ya existe, saltando seed');
            return;
        }
        for (let i = 10; i >= 1; i--) {
            const start = new Date();
            start.setDate(start.getDate() - i);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            const voiceMinutes = parseFloat((Math.random() * 80 + 20).toFixed(1));
            const videoMinutes = parseFloat((Math.random() * 40 + 5).toFixed(1));
            const smsCount = 0;
            const costUsd = parseFloat(
                (voiceMinutes * PRICE_PER_VOICE_MIN + videoMinutes * PRICE_PER_VIDEO_MIN).toFixed(4)
            );
            await ProviderMetric.create({
                provider: 'twilio',
                periodStart: start,
                periodEnd: end,
                voiceMinutes,
                videoMinutes,
                smsCount,
                costUsd,
            });
            console.log(`✅ Seed Twilio: ${start.toDateString()} — voz:${voiceMinutes}m video:${videoMinutes}m $${costUsd}`);
        }
    } catch (err) {
        console.error('❌ Error en seed histórico Twilio:', err.message);
    }
}

async function syncTwilioMetrics() {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const end = new Date(yesterday);
        end.setDate(end.getDate() + 1);

        const existing = await ProviderMetric.findOne({
            provider: 'twilio',
            periodStart: yesterday,
        });
        if (existing) {
            console.log('📊 Twilio metrics de ayer ya existen');
            return;
        }

        const calls = await CallLog.find({
            provider: 'twilio',
            startedAt: { $gte: yesterday, $lt: end },
        }).select('type durationSeconds');

        let voiceMinutes = 0;
        let videoMinutes = 0;

        for (const call of calls) {
            const minutes = (call.durationSeconds ?? 0) / 60;
            if (call.type === 'video') {
                videoMinutes += minutes;
            } else {
                voiceMinutes += minutes;
            }
        }

        voiceMinutes = parseFloat(voiceMinutes.toFixed(2));
        videoMinutes = parseFloat(videoMinutes.toFixed(2));

        const costUsd = parseFloat(
            (voiceMinutes * PRICE_PER_VOICE_MIN + videoMinutes * PRICE_PER_VIDEO_MIN).toFixed(4)
        );

        await ProviderMetric.create({
            provider: 'twilio',
            periodStart: yesterday,
            periodEnd: end,
            voiceMinutes,
            videoMinutes,
            smsCount: 0,
            costUsd,
        });

        console.log(`✅ Twilio metrics guardadas — voz:${voiceMinutes}min video:${videoMinutes}min $${costUsd}`);
    } catch (err) {
        console.error('❌ Error sincronizando Twilio metrics:', err.message);
    }
}

function scheduleDailySync() {
    const midnight = new Date();
    midnight.setHours(24, 0, 5, 0);
    const ms = midnight - Date.now();
    setTimeout(async () => {
        await syncTwilioMetrics();
        scheduleDailySync();
    }, ms);
    console.log(`⏰ Próxima sync Twilio en ${Math.round(ms / 1000 / 60)} minutos`);
}

module.exports = { syncTwilioMetrics, scheduleDailySync, seedTwilioHistory };