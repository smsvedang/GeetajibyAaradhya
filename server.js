/* --- Aaradhya Geetaji - Final Server Code (All Likes Fixed) --- */
const express = require('express');
const mongoose = require('mongoose');
const Progress = require('./models/Progress'); 
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
    video_id: { type: String, required: true },
    likes: { type: Number, default: 0 }
});
const Shloka = mongoose.model('Shloka', shlokaSchema);

// --- 2. SiteContent Model ('About') ---
const contentSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String, required: false }
});
const SiteContent = mongoose.model('SiteContent', contentSchema);

// --- 3. Artwork Model (Updated) ---
const artworkSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    likes: { type: Number, default: 0 } // Likes added
});
const Artwork = mongoose.model('Artwork', artworkSchema);

// --- 4. Blog Model (Updated) ---
const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 } // Likes added
});
const Blog = mongoose.model('Blog', blogSchema);

// --- 5. Testimonial Model ---
const testimonialSchema = new mongoose.Schema({
    author: { type: String, required: true },
    quote: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'approved'], 
        default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now }
});
const Testimonial = mongoose.model('Testimonial', testimonialSchema);

// --- 6. Course Model ---
const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    adhyay: { type: Number, required: true },
    shlokas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shloka' }],
    createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', courseSchema);

// --- 7. Quiz Model ---
const quizSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    passPercentage: { type: Number, default: 50 },
    questions: [{
        question: String,
        options: [String],
        correctIndex: Number
    }]
});
const Quiz = mongoose.model('Quiz', quizSchema);

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

// Single shloka ID se fetch karein (shloka.html ke liye)
app.get('/api/shloka/:id', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const shloka = await Shloka.findById(req.params.id);
        if (!shloka) {
            return res.status(404).json({ message: 'Shloka not found' });
        }
        res.json(shloka);
    } catch (err) {
        res.status(500).json({ message: 'Shloka laane mein error' });
    }
});

// --- [FIXED & UPDATED] Shloka Like API ---
// Note: URL 'shloka' (singular) kar diya hai, frontend se match karne ke liye
app.post('/api/shloka/like/:id', async (req, res) => {
    try {
        const updatedShloka = await Shloka.findByIdAndUpdate(
            req.params.id,
            { $inc: { likes: 1 } }, // 'likes' count ko 1 se badhao
            { new: true } // Taki naya data wapas mile
        );

        if (!updatedShloka) {
            return res.status(404).json({ success: false, message: 'Shloka not found' });
        }
        res.json({ success: true, likes: updatedShloka.likes });

    } catch (err) {
        res.status(500).json({ message: 'Error liking shloka' });
    }
});


// (Shloka POST, PUT, DELETE APIs)
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
            { content: newText, imageUrl: newImageUrl },
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

// NAYA: Ek single artwork ID se fetch karein (Public)
app.get('/api/artwork/:id', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const artwork = await Artwork.findById(req.params.id);
        if (!artwork) {
            return res.status(404).json({ message: 'Artwork not found' });
        }
        res.json(artwork);
    } catch (err) {
        console.error("ERROR FETCHING ARTWORK:", err);
        res.status(500).json({ message: 'Artwork laane mein error' });
    }
});

// --- [UPDATED] Artwork Like API ---
app.post('/api/artwork/like/:id', async (req, res) => {
    try {
        const updatedArtwork = await Artwork.findByIdAndUpdate(
            req.params.id,
            { $inc: { likes: 1 } },
            { new: true }
        );

        if (!updatedArtwork) {
            return res.status(404).json({ success: false, message: 'Artwork not found' });
        }
        res.json({ success: true, likes: updatedArtwork.likes });

    } catch (err) {
        res.status(500).json({ message: 'Error liking artwork' });
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
        const posts = await Blog.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: 'Blog posts laane mein error' });
    }
});

// NAYA: Ek single blog post ID se fetch karein (Public)
app.get('/api/blog/:id', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const post = await Blog.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.json(post);
    } catch (err) {
        console.error("ERROR FETCHING BLOG POST:", err);
        res.status(500).json({ message: 'Blog post laane mein error' });
    }
});

// --- [UPDATED] Blog Post Like API ---
app.post('/api/blog/like/:id', async (req, res) => {
    try {
        const updatedPost = await Blog.findByIdAndUpdate(
            req.params.id,
            { $inc: { likes: 1 } },
            { new: true }
        );

        if (!updatedPost) {
            return res.status(404).json({ success: false, message: 'Blog post not found' });
        }
        res.json({ success: true, likes: updatedPost.likes });

    } catch (err) {
        res.status(500).json({ message: 'Error liking post' });
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

// --- Course APIs ---
app.get('/api/courses/:id', async (req, res) => {
    const course = await Course
        .findById(req.params.id)
        .populate('shlokas');
    res.json(course);
});
app.get('/api/courses', async (req, res) => {
    try {
        const courses = await Course.find().populate('shlokas');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: 'Courses laane mein error' });
    }
});
app.post('/api/courses', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }

    try {
        const course = new Course({
            title: req.body.title,
            description: req.body.description,
            adhyay: Number(req.body.adhyay),
            shlokas: req.body.shlokas // array of shloka IDs
        });
        await course.save();
        res.status(201).json(course);
    } catch (err) {
        res.status(500).json({ message: 'Course save karne mein error' });
    }
});
app.delete('/api/courses/:id', async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);

        // Safety: related quiz bhi delete
        await Quiz.deleteOne({ course: req.params.id });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});


//---Progress APIs---
app.get('/api/progress/:mobile/:courseId', async (req, res) => {
    try {
        const { mobile, courseId } = req.params;

        const progress = await Progress.findOne({
            mobile,
            courseId
        }).lean();

        return res.json(progress || { completed: [] });

    } catch (err) {
        console.error('Progress fetch error:', err);
        return res.status(500).json({ completed: [] });
    }
});
app.post('/api/progress/save', async (req, res) => {
    try {
        const { mobile, courseId, completed } = req.body;

        let progress = await Progress.findOne({ mobile, courseId });

        if (!progress) {
            progress = new Progress({
                mobile,
                courseId,
                completed
            });
        } else {
            progress.completed = [
                ...new Set([...progress.completed, ...completed])
            ];
        }

        await progress.save();
        return res.json({ success: true });

    } catch (err) {
        console.error('Progress save error:', err);
        return res.status(500).json({ success: false });
    }
});

// --- Quiz APIs ---
app.get('/api/quiz/:courseId', async (req, res) => {
    const quiz = await Quiz.findOne({ course: req.params.courseId });
    res.json(quiz);
});
app.post('/api/quiz', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const { course, passPercentage, questions } = req.body;

    const quiz = await Quiz.findOneAndUpdate(
        { course },
        { course, passPercentage, questions },
        { upsert: true, new: true }
    );

    res.json({ success: true, quiz });
});
app.post('/api/quiz/complete', async (req, res) => {
    const { mobile, courseId, score } = req.body;

    await Progress.findOneAndUpdate(
        { mobile, courseId },
        {
            quizPassed: true,
            quizScore: score
        },
        { upsert: true }
    );

    res.json({ success: true });
});
app.get('/api/quiz', async (req, res) => {
    const quizzes = await Quiz.find().populate('course');
    res.json(quizzes);
});
app.put('/api/quiz/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    await Quiz.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});
app.delete('/api/quiz/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});
app.delete('/api/quizzes/:courseId', async (req, res) => {
    try {
        await Quiz.deleteOne({ course: req.params.courseId });
        res.json({ success: true });
    } catch {
        res.status(500).json({ message: 'Quiz delete failed' });
    }
});

//---Certificate APIs---
app.get('/api/certificate', async (req, res) => {
    try {
        const { name, email, mobile, courseTitle, lang } = req.query;

        // ✅ safety check
        if (!name || !courseTitle) {
            return res.status(400).send('Missing data');
        }

        // ✅ IMPORTANT: course title ko freeze kar diya
        const finalCourseTitle = courseTitle;

        const fs = require('fs');
        const path = require('path');

        // load certificate HTML template
        let html = fs.readFileSync(
            path.join(__dirname, 'public/certificate.html'),
            'utf8'
        );

        // inject values into HTML
        html = html
            .replace('{{NAME}}', name)
            .replace('{{COURSE}}', finalCourseTitle)   // ✅ FIX HERE
            .replace('{{EMAIL}}', email || '')
            .replace('{{LANG}}', lang || 'en');

        // send rendered certificate
        res.send(html);

    } catch (err) {
        console.error(err);
        res.status(500).send('Certificate error');
    }
});

// ================= CERTIFICATES LIST (ADMIN) =================
app.get('/api/certificates', async (req, res) => {
    try {
        const certificates = await Certificate.find().sort({ createdAt: -1 });
        res.json(certificates);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to load certificates' });
    }
});

//--- Course progress ---//
app.get('/api/course-progress/:courseId', async (req, res) => {
    const data = await Progress.find({ courseId: req.params.courseId });
    res.json(data);
});

// --- Testimonial APIs ---
app.get('/api/testimonials', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        const testimonials = await Testimonial.find({ status: 'approved' }).sort({ createdAt: -1 });
        res.json(testimonials);
    } catch (err) {
        res.status(500).json({ message: 'Testimonials laane mein error' });
    }
});
app.get('/api/testimonials/all', async (req, res) => {
    try {
        const testimonials = await Testimonial.find().sort({ status: 1, createdAt: -1 });
        res.json(testimonials);
    } catch (err) {
        res.status(500).json({ message: 'Saare Testimonials laane mein error' });
    }
});
app.post('/api/testimonials', async (req, res) => {
    try {
        const newTestimonial = new Testimonial({
            author: req.body.author,
            quote: req.body.quote
        });
        await newTestimonial.save();
        res.status(201).json({ success: true, message: 'Testimonial submitted for review!' });
    } catch (err) {
        res.status(400).json({ message: 'Testimonial submit karne mein error' });
    }
});
app.post('/api/testimonials/admin', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const newTestimonial = new Testimonial({
            author: req.body.author,
            quote: req.body.quote,
            status: 'approved'
        });
        await newTestimonial.save();
        res.status(201).json(newTestimonial);
    } catch (err) {
        res.status(500).json({ message: 'Testimonial jodne mein error' });
    }
});
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