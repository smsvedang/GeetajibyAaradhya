const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// --- Middleware ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- MongoDB Connection ---
const dbURI = process.env.MONGO_URI; 
mongoose.connect(dbURI)
    .then(() => console.log('MongoDB se jud gaye!'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// --- 1. Shloka Model ---
const shlokaSchema = new mongoose.Schema({
    adhyay: { type: Number, required: true },
    shloka: { type: Number, required: true },
    text: { type: String, required: false },
    video_id: { type: String, required: true }
});
const Shloka = mongoose.model('Shloka', shlokaSchema);

// --- 2. API Routes ---

// GET: Saare shlokas paayein
app.get('/api/shlokas', async (req, res) => {
    try {
        const shlokas = await Shloka.find().sort({ adhyay: 1, shloka: 1 });
        res.json(shlokas);
    } catch (err) {
        res.status(500).json({ message: 'Shlokas laane mein error' });
    }
});

// POST: Login (Sirf password check karega)
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true }); // Bas success bhej do
    } else {
        res.status(401).json({ success: false, message: 'Galat Password!' });
    }
});

// POST: Naya shloka jodein (Password ke saath)
app.post('/api/shlokas', async (req, res) => {
    
    // Yahaan password check karenge
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    
    // Agar password sahi hai, toh shloka jodo
    try {
        const newShloka = new Shloka({
            adhyay: req.body.adhyay,
            shloka: req.body.shloka,
            text: req.body.text,
            video_id: req.body.video_url
        });
        
        await newShloka.save();
        res.status(201).json({ success: true, message: 'Shloka jud gaya!' });

    } catch (err) {
        res.status(500).json({ message: 'Shloka jodne mein error' });
    }
});

// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} par chal raha hai`);
});

module.exports = app;