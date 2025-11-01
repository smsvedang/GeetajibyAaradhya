const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken'); // लॉगिन टोकन के लिए

const app = express();

// --- Middleware ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// --- MongoDB Connection ---
// यह Vercel से 'MONGO_URI' को खुद उठा लेगा
const dbURI = process.env.MONGO_URI; 

mongoose.connect(dbURI)
    .then(() => console.log('MongoDB से जुड़ गए!'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
    });

// --- 1. Shloka Model (डेटाबेस को बताना श्लोक कैसा दिखेगा) ---
const shlokaSchema = new mongoose.Schema({
    adhyay: { type: Number, required: true },
    shloka: { type: Number, required: true },
    text: { type: String, required: false },
    video_id: { type: String, required: true }
});

// 'Shloka' नाम का मॉडल बनाना
const Shloka = mongoose.model('Shloka', shlokaSchema);


// --- 2. API Routes ---

// GET: सारे श्लोक पाएं (पब्लिक वेबसाइट के लिए)
app.get('/api/shlokas', async (req, res) => {
    try {
        // सारे श्लोक ढूंढें और उन्हें अध्याय/श्लोक के हिसाब से सॉर्ट करें
        const shlokas = await Shloka.find().sort({ adhyay: 1, shloka: 1 });
        res.json(shlokas);
    } catch (err) {
        res.status(500).json({ message: 'Shlokas लाने में एरर' });
    }
});

// POST: एडमिन लॉगिन
app.post('/api/login', (req, res) => {
    const { password } = req.body;

    // पासवर्ड चेक करें (जो Vercel में सेट किया था)
    if (password === process.env.ADMIN_PASSWORD) {
        // पासवर्ड सही है, एक 1 घंटे का टोकन बनाओ
        const token = jwt.sign(
            { user: 'admin' }, // पेलोड
            process.env.JWT_SECRET, // सीक्रेट की
            { expiresIn: '1h' } // 1 घंटे में एक्सपायर
        );
        res.json({ success: true, token: token });
    } else {
        // गलत पासवर्ड
        res.status(401).json({ success: false, message: 'गलत पासवर्ड!' });
    }
});

// POST: नया श्लोक जोड़ें (सिर्फ एडमिन)
// हमें एक 'middleware' बनाना होगा जो टोकन चेक करे
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: 'कोई टोकन नहीं, अनुमति नहीं' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'टोकन वैलिड नहीं है' });
        }
        req.user = user;
        next(); // टोकन सही है, अगले काम (श्लोक जोड़ने) पर जाओ
    });
};

// 'verifyToken' को बीच में डाला गया है
app.post('/api/shlokas', verifyToken, async (req, res) => {
    try {
        const newShloka = new Shloka({
            adhyay: req.body.adhyay,
            shloka: req.body.shloka,
            text: req.body.text,
            video_id: req.body.video_url
        });
        
        await newShloka.save();
        res.status(201).json({ success: true, message: 'श्लोक जुड़ गया!' });

    } catch (err) {
        res.status(500).json({ message: 'श्लोक जोड़ने में एरर' });
    }
});


// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`सर्वर ${PORT} पर चल रहा है`);
});

// Vercel के लिए ज़रूरी एक्सपोर्ट
module.exports = app;