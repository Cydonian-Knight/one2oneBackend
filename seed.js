require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/User');
const Conversation = require('./src/models/Conversation');
const Message = require('./src/models/Message');
const Report = require('./src/models/Report');
const CallLog = require('./src/models/CallLog');
const ProviderMetric = require('./src/models/ProviderMetric');

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("--- Conectado a MongoDB para el Seeding ---");

        // 1. LIMPIEZA TOTAL
        await Promise.all([
            User.deleteMany({}),
            Conversation.deleteMany({}),
            Message.deleteMany({}),
            Report.deleteMany({}),
            CallLog.deleteMany({}),
            ProviderMetric.deleteMany({})
        ]);
        console.log("✔ Base de datos limpia.");

        // 2. USUARIOS
        const salt = await bcrypt.genSalt(10);
        const hashedPw = await bcrypt.hash("password123", salt);

        const users = await User.insertMany([
            {
                _id: "u_0001",
                email: "zauron205@gmail.com",
                password: hashedPw,
                username: "usuario1",
                age: 25,
                avatarUrl: null,
                status: "active",
                lastSeenAt: new Date()
            },
            {
                _id: "u_0002",
                email: "zauron@email.com",
                password: hashedPw,
                username: "usuario2",
                age: 27,
                avatarUrl: null,
                status: "active",
                lastSeenAt: new Date()
            }
        ]);
        console.log("✔ Usuarios creados.");

        // 3. CONVERSACIONES
        const conversation = await Conversation.create({
            conversationId: "c_0001",
            participants: ["u_0001", "u_0002"],
            isActive: true,
            // Agregamos el rastro del último mensaje
            lastMessage: {
                text: "Hola, ¿cómo estás?",
                type: "text",
                senderId: "u_0001",
                createdAt: new Date()
            },
            // Simulamos que el usuario 2 tiene 1 mensaje sin leer (el de arriba)
            unreadCounts: {
                "u_0001": 0,
                "u_0002": 1
            }
        });

        // 4. MENSAJES
        const msg = await Message.create({
            conversationId: "c_0001",
            senderId: "u_0001",
            type: "text",
            content: "Hola, ¿cómo estás?",
            isReported: false
        });
        console.log("✔ Mensaje inicial creado.");

        // 5. REPORTES (Usando el ID real del mensaje creado arriba)
        await Report.create({
            reportId: "r_0001",
            messageId: msg._id,
            reportedUserId: "u_0002",
            reporterUserId: "u_0001",
            reason: "Contenido ofensivo",
            status: "pending"
        });

        // 6. CALL LOGS
        await CallLog.create({
            callId: "call_0001",
            conversationId: "c_0001",
            fromUserId: "u_0001",
            toUserId: "u_0002",
            type: "voice",
            provider: "twilio",
            providerCallSid: "CAxxxxxxxx",
            startedAt: new Date(),
            endedAt: new Date(Date.now() + 320000), // +320 segundos
            durationSeconds: 320
        });

        // 7. METRICAS
        await ProviderMetric.create({
            provider: "twilio",
            periodStart: new Date("2026-05-01T00:00:00Z"),
            periodEnd: new Date("2026-05-02T00:00:00Z"),
            voiceMinutes: 120.5,
            videoMinutes: 45.2,
            smsCount: 320,
            costUsd: 18.75
        });

        console.log("--- SEEDING COMPLETADO EXITOSAMENTE ---");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error en el Seeding:", err);
        process.exit(1);
    }
};

seedDB();