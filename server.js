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
    .then(() => console.log('MongoDB से जुड़ गए!'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// --- 1. Shloka Model ---
const shlokaSchema = new mongoose.Schema({
    adhyay: { type: Number, required: true },
    shloka: { type: Number, required: true },
    text: { type: String, required: false },
    video_id: { type: String, required: true }
});
const Shloka = mongoose.model('Shloka', shlokaSchema);

// --- 2. SiteContent Model ('About') ---
const contentSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String, required: false }
});
const SiteContent = mongoose.model('SiteContent', contentSchema);

// --- 3. NAYA Artwork Model ---
const artworkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true }
});
const Artwork = mongoose.model('Artwork', artworkSchema);


// --- API Routes ---

// Shloka APIs (No Change)
app.get('/api/shlokas', async (req, res) => { /* ... (Pehle jaisa) ... */ });
app.post('/api/login', (req, res) => { /* ... (Pehle jaisa) ... */ });
app.post('/api/shlokas', async (req, res) => { /* ... (Pehle jaisa) ... */ });

// 'About' APIs (No Change)
app.get('/api/about', async (req, res) => { /* ... (Pehle jaisa) ... */ });
app.post('/api/about', async (req, res) => { /* ... (Pehle jaisa) ... */ });

// --- !! NAYE ARTWORK APIS !! ---

// GET: Saare artwork paayein (index.html ke liye)
app.get('/api/artwork', async (req, res) => {
    try {
        const artworks = await Artwork.find();
        res.json(artworks);
    } catch (err) {
        res.status(500).json({ message: 'Artwork laane mein error' });
    }
});

// POST: Naya artwork jodein (admin.html ke liye)
app.post('/api/artwork', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    
    try {
        const newArtwork = new Artwork({
            title: req.body.title,
            imageUrl: req.body.imageUrl
        });
        await newArtwork.save();
        res.status(201).json(newArtwork); // Naya item wapas bhejo
    } catch (err) {
        res.status(500).json({ message: 'Artwork jodne mein error' });
    }
});

// DELETE: Artwork delete karein (admin.html ke liye)
app.delete('/api/artwork/:id', async (req, res) => {
    // ID ko URL se extract karo
    const { id } = req.params;
    
    // Password ko body se extract karo
    const { password } = req.body;

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }

    try {
        await Artwork.findByIdAndDelete(id);
        res.json({ success: true, message: 'Artwork deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Artwork delete karne mein error' });
    }
});


// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} par chal raha hai`);
});

module.exports = app;