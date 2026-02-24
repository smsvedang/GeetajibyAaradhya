const mongoose = require('mongoose');

let cached = global.__geeta_db_cache;
if (!cached) {
    cached = global.__geeta_db_cache = { conn: null, promise: null };
}

async function connectDb() {
    if (cached.conn) return cached.conn;
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not configured');
    }
    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGO_URI, {
            bufferCommands: false
        }).then((m) => m);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

function getTodayInIST() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function parseBody(req) {
    if (!req || typeof req.body === 'undefined' || req.body === null) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch {
            return {};
        }
    }
    return req.body;
}

module.exports = {
    connectDb,
    getTodayInIST,
    parseBody
};
