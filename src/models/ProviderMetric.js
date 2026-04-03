const mongoose = require('mongoose');

const providerMetricSchema = new mongoose.Schema({
    provider: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    voiceMinutes: { type: Number, default: 0 },
    videoMinutes: { type: Number, default: 0 },
    smsCount: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 }
}, { timestamps: true });

// Índice para buscar métricas por rango de tiempo
providerMetricSchema.index({ periodStart: 1, periodEnd: 1 });

module.exports = mongoose.model('ProviderMetric', providerMetricSchema);