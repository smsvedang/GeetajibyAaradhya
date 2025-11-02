const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// --- Middleware ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// 'public' folder se HTML, CSS, aur Images serve karega
app.use(express.static(path.join(__dirname, 'public')));


// --- MongoDB Connection ---
// (Yeh Vercel ke Environment Variables se MONGO_URI utha lega)
const dbURI = process.env.MONGO_URI; 
mongoose.connect(dbURI)
    .then(() => console.log('MongoDB से जुड़ गए!'))
    .catch(err => console.error('MongoDB Connection Error:', err));


// --- 1. Shloka Model (Database ka Niyam) ---
const shlokaSchema = new mongoose.Schema({
    adhyay: { type: Number, required: true },
    shloka: { type: Number, required: true },
    text: { type: String, required: false },
    video_id: { type: String, required: true }
});
const Shloka = mongoose.model('Shloka', shlokaSchema);


// --- 2. SiteContent Model ('About' section ke liye Naya Niyam) ---
const contentSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    content: { type: String, required: true }
});
const SiteContent = mongoose.model('SiteContent', contentSchema);


// --- 3. API Routes ---

// GET: Saare shlokas paayein (index.html ke liye)
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
            // (FIX: String ko Number mein badalna)
            adhyay: Number(req.body.adhyay),
            shloka: Number(req.body.shloka),
            text: req.body.text,
            video_id: req.body.video_url
        });
        
        await newShloka.save();
        res.status(201).json({ success: true, message: 'Shloka jud gaya!' });

    } catch (err) {
        console.error(err); // Error ko Vercel logs mein dekhein
        res.status(500).json({ message: 'Shloka jodne mein error', error: err.message });
    }
});


// --- 'ABOUT' SECTION KE LIYE NYE API ---

// GET: 'About' text (index.html ke liye)
app.get('/api/about', async (req, res) => {
    try {
        let about = await SiteContent.findOne({ key: 'aboutText' });
        if (!about) {
            // Agar database mein nahi hai, toh default text bana do
            about = new SiteContent({ key: 'aboutText', content: 'Welcome! Please update this text in the admin panel.' });
            await about.save();
        }
        res.json(about);
    } catch (err) {
        res.status(500).json({ message: 'Cannot fetch about text' });
    }
});

// POST: 'About' text update karein (admin.html ke liye)
app.post('/api/about', async (req, res) => {
    // Password check karo
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    
    try {
        const { newText } = req.body;
        // 'aboutText' ko dhoondho aur update karo
        await SiteContent.findOneAndUpdate(
            { key: 'aboutText' },
            { content: newText },
            { upsert: true } // Agar nahi hai toh naya bana dega
        );
        res.json({ success: true, message: 'About section updated!' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating about text' });
    }
});


// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} par chal raha hai`);
});

// Vercel ke liye zaroori
module.exports = app;