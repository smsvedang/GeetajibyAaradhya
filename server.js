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

// --- 3. Artwork Model ---
const artworkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true }
});
const Artwork = mongoose.model('Artwork', artworkSchema);


// --- API Routes ---

// GET: Saare shlokas
app.get('/api/shlokas', async (req, res) => {
    try {
        const shlokas = await Shloka.find().sort({ adhyay: 1, shloka: 1 });
        res.json(shlokas);
    } catch (err) {
        res.status(500).json({ message: 'Shlokas laane mein error' });
    }
});

// POST: Login (Yeh 'POST' hai, 'GET' nahi)
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Galat Password!' });
    }
});

// POST: Naya shloka jodein
app.post('/api/shlokas', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const newShloka = new Shloka({
            adhyay: Number(req.body.adhyay),
            shloka: Number(req.body.shloka),
            text: req.body.text,
            video_id: req.body.video_url
        });
        await newShloka.save();
        res.status(201).json({ success: true, message: 'Shloka jud gaya!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Shloka jodne mein error', error: err.message });
    }
});

// GET: 'About' content
app.get('/api/about', async (req, res) => {
    try {
        let about = await SiteContent.findOne({ key: 'aboutText' });
        if (!about) {
            about = new SiteContent({ 
                key: 'aboutText', 
                content: 'Welcome! Please update this text in the admin panel.',
                imageUrl: 'placeholder.jpg'
            });
            await about.save();
        }
        res.json(about);
    } catch (err) {
        res.status(500).json({ message: 'Cannot fetch about text' });
    }
});

// POST: 'About' content update karein
app.post('/api/about', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const { newText, newImageUrl } = req.body;
        await SiteContent.findOneAndUpdate(
            { key: 'aboutText' },
            { 
                content: newText,
                imageUrl: newImageUrl
            },
            { upsert: true } 
        );
        res.json({ success: true, message: 'About section updated!' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating about text' });
    }
});

// --- ARTWORK APIS ---

// GET: Saare artwork
app.get('/api/artwork', async (req, res) => {
    try {
        const artworks = await Artwork.find();
        res.json(artworks);
    } catch (err) {
        res.status(500).json({ message: 'Artwork laane mein error' });
    }
});

// POST: Naya artwork jodein
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
        res.status(201).json(newArtwork);
    } catch (err) {
        res.status(500).json({ message: 'Artwork jodne mein error' });
    }
});

// DELETE: Artwork delete karein
app.delete('/api/artwork/:id', async (req, res) => {
    const { id } = req.params;
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