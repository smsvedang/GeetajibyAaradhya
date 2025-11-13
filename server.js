/* --- Aaradhya Geetaji - Final Server Code --- */
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

// --- 4. Blog Model ---
const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now } // Taaki naye post upar dikhein
});
const Blog = mongoose.model('Blog', blogSchema);

// --- 5. Testimonial Model ---
const testimonialSchema = new mongoose.Schema({
    author: { type: String, required: true },
    quote: { type: String, required: true },
    // Status field (default 'pending' rahega)
    status: { 
        type: String, 
        enum: ['pending', 'approved'], 
        default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now }
});
const Testimonial = mongoose.model('Testimonial', testimonialSchema);


// --- API Routes ---

// --- Login API ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ message: 'Galat Password!' });
    }
});

// --- Shloka APIs ---
app.get('/api/shlokas', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        const shlokas = await Shloka.find().sort({ adhyay: 1, shloka: 1 });
        res.json(shlokas);
    } catch (err) {
        res.status(500).json({ message: 'Shlokas laane mein error' });
    }
});

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

app.put('/api/shlokas/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const { id } = req.params;
        const updatedShloka = {
            adhyay: Number(req.body.adhyay),
            shloka: Number(req.body.shloka),
            text: req.body.text,
            video_id: req.body.video_url
        };
        await Shloka.findByIdAndUpdate(id, updatedShloka);
        res.json({ success: true, message: 'Shloka updated!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Shloka update karne mein error', error: err.message });
    }
});

app.delete('/api/shlokas/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const { id } = req.params;
        await Shloka.findByIdAndDelete(id);
        res.json({ success: true, message: 'Shloka deleted!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Shloka delete karne mein error', error: err.message });
    }
});

// --- 'About' APIs ---
app.get('/api/about', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
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

// --- Artwork APIs ---
app.get('/api/artwork', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        const artworks = await Artwork.find();
        res.json(artworks);
    } catch (err) {
        res.status(500).json({ message: 'Artwork laane mein error' });
    }
});

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

// --- Blog APIs ---
app.get('/api/blog', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        const posts = await Blog.find().sort({ createdAt: -1 }); // Naye post pehle
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Blog posts laane mein error' });
    }
});

app.post('/api/blog', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const newPost = new Blog({
            title: req.body.title,
            content: req.body.content
        });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (err) {
        res.status(500).json({ message: 'Post jodne mein error' });
    }
});

app.put('/api/blog/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const { id } = req.params;
        const updatedPost = await Blog.findByIdAndUpdate(id, {
            title: req.body.title,
            content: req.body.content
        }, { new: true });
        res.json(updatedPost);
    } catch (err) {
        res.status(500).json({ message: 'Post update karne mein error' });
    }
});

app.delete('/api/blog/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const { id } = req.params;
        await Blog.findByIdAndDelete(id);
        res.json({ success: true, message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Post delete karne mein error' });
    }
});

// --- Testimonial APIs ---

// GET: Saare APPROVED testimonials (Public - index.html ke liye)
app.get('/api/testimonials', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Sirf 'approved' testimonials bhejein
        const testimonials = await Testimonial.find({ status: 'approved' }).sort({ createdAt: -1 });
        res.json(testimonials);
    } catch (err) {
        res.status(500).json({ message: 'Testimonials laane mein error' });
    }
});

// GET: Saare testimonials (Admin - admin.html ke liye)
app.get('/api/testimonials/all', async (req, res) => {
    try {
        // Status ke hisaab se sort karein (pending pehle)
        const testimonials = await Testimonial.find().sort({ status: 1, createdAt: -1 });
        res.json(testimonials);
    } catch (err) {
        res.status(500).json({ message: 'Saare Testimonials laane mein error' });
    }
});

// POST: Naya testimonial submit karein (Public - index.html se)
app.post('/api/testimonials', async (req, res) => {
    try {
        // Ismein password check nahi hai
        const newTestimonial = new Testimonial({
            author: req.body.author,
            quote: req.body.quote
            // Status default 'pending' rahega
        });
        await newTestimonial.save();
        res.status(201).json({ success: true, message: 'Testimonial submitted for review!' });
    } catch (err) {
        res.status(400).json({ message: 'Testimonial submit karne mein error' });
    }
});

// POST: Naya testimonial add karein (Admin - admin.html se)
app.post('/api/testimonials/admin', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const newTestimonial = new Testimonial({
            author: req.body.author,
            quote: req.body.quote,
            status: 'approved' // Admin add karega toh seedha approved
        });
        await newTestimonial.save();
        res.status(201).json(newTestimonial);
    } catch (err) {
        res.status(500).json({ message: 'Testimonial jodne mein error' });
    }
});

// PUT: Testimonial update karein (Admin - Edit ke liye)
app.put('/api/testimonials/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const { id } = req.params;
        const updatedTestimonial = await Testimonial.findByIdAndUpdate(id, {
            author: req.body.author,
            quote: req.body.quote
        }, { new: true });
        res.json(updatedTestimonial);
    } catch (err) {
        res.status(500).json({ message: 'Testimonial update karne mein error' });
    }
});

// PUT: Testimonial ko approve karein (Admin)
app.put('/api/testimonials/approve/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const { id } = req.params;
        const approvedTestimonial = await Testimonial.findByIdAndUpdate(id, {
            status: 'approved'
        }, { new: true });
        res.json(approvedTestimonial);
    } catch (err) {
        res.status(500).json({ message: 'Testimonial approve karne mein error' });
    }
});

// DELETE: Testimonial delete karein (Admin)
app.delete('/api/testimonials/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const { id } = req.params;
        await Testimonial.findByIdAndDelete(id);
        res.json({ success: true, message: 'Testimonial deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Testimonial delete karne mein error' });
    }
});


// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} par chal raha hai`);
});

// Vercel ke liye zaroori
module.exports = app;