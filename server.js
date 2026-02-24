/* --- Aaradhya Geetaji - Final Server Code (Admin Enhanced) --- */
const express = require('express');
const mongoose = require('mongoose');
const Progress = require('./models/Progress');
const bodyParser = require('body-parser');
const path = require('path');
const Certificate = require('./models/Certificate');
const admin = require('firebase-admin');

const app = express();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const DEFAULT_DAILY_LIMIT = 3;
const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
});

function getTodayDateString() {
    return IST_DATE_FORMATTER.format(new Date());
}

function toSlug(value = '') {
    return value
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function shlokaSlug(adhyay, shloka) {
    return `adhyay-${Number(adhyay)}-shlok-${Number(shloka)}`;
}

function makeCertificateId(courseTitle, mobile) {
    const courseCode = String(courseTitle || 'GEN')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 8) || 'GEN';
    const studentId = String(mobile || '').slice(-4) || '0000';
    const year = new Date().getFullYear();
    return `GS-${courseCode}-${studentId}-${year}`;
}

function cleanClientPath(input) {
    if (!input || typeof input !== 'string') return DEFAULT_PUSH_URL;
    const pathOnly = input.trim();
    const allowed = [
        /^\/$/,
        /^\/courses$/,
        /^\/blog$/,
        /^\/artwork$/,
        /^\/adhyay-\d+\/shlok-\d+$/,
        /^\/course\/[a-z0-9-]+$/,
        /^\/blog\/[a-z0-9-]+$/
    ];
    const isAllowed = allowed.some((rule) => rule.test(pathOnly));
    if (!isAllowed) return DEFAULT_PUSH_URL;
    return pathOnly.startsWith('http') ? pathOnly : `https://warrioraaradhya.in${pathOnly}`;
}

// ✅ PRD v6.2: Check if string is MongoDB ObjectId format
function isMongoObjectId(str = '') {
    return /^[0-9a-fA-F]{24}$/.test(String(str));
}

function isCrisisMessage(message = '') {
    const text = message.toLowerCase();
    const keywords = [
        'suicide', 'kill myself', 'end my life', 'want to die', 'self harm',
        'i should die', 'marna chahta', 'marna chahti', 'apni jaan', 'khudkushi'
    ];
    return keywords.some((keyword) => text.includes(keyword));
}

function isGreetingMessage(message = '') {
    const text = message.toLowerCase().trim();
    return ['hi', 'hello', 'namaste', 'namaskar', 'hare krishna'].includes(text);
}

function isAboutSaarathiMessage(message = '') {
    const text = message.toLowerCase();
    const keywords = [
        'who are you', 'about you', 'tum kaun', 'aap kaun', 'geeta saarathi kya',
        'what can you do', 'tum kya karte ho', 'aap kya karte ho', 'privacy', 'data save'
    ];
    return keywords.some((keyword) => text.includes(keyword));
}

function aboutSaarathiResponse() {
    return [
        'Main Geeta Saarathi hoon, Bhagavad Gita adharit guidance tool.',
        'Main therapy replacement nahi hoon, sirf margdarshan ke liye hoon.',
        'Aapka chat content database me save nahi hota.',
        'Sirf daily usage counter maintain hota hai.',
        'Aap apni paristhiti likhen, main Gita ke sandarbh me margdarshan dunga.'
    ].join('\n');
}

function crisisResponse() {
    return [
        '🔍 Manasik Avastha Vishleshan',
        'Aap is samay gambhir mansik peeda mein lag rahe hain. Aap akele nahi hain.',
        '',
        '📖 Adhyay + Shlok Number',
        'Bhagavad Gita 2.14',
        '',
        '🕉 Sanskrit Shlok',
        'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।',
        '',
        '📘 Hindi Meaning',
        'Dukh aur sukh sthayi nahi hote. Yeh samay bhi beet jayega.',
        '',
        '📗 English Meaning',
        'Pain and comfort are temporary; this moment will pass.',
        '',
        '🪔 Practical Margdarshan',
        'Kripya turant Tele-MANAS 14416 ya 1-800-891-4416 par call karein. Kisi trusted vyakti ko abhi batayein aur professional mental-health help lein.'
    ].join('\n');
}

function ensureStructuredSections(text = '') {
    const requiredSections = [
        '🔍 Manasik Avastha Vishleshan',
        '📖 Adhyay + Shlok Number',
        '🕉 Sanskrit Shlok',
        '📘 Hindi Meaning',
        '📗 English Meaning',
        '🪔 Practical Margdarshan'
    ];
    return requiredSections.every((section) => text.includes(section));
}

// --- Middleware ---
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Clean URL routes
app.get('/adhyay-:adhyay/shlok-:shloka', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shloka.html'));
});
app.get('/course/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'courses.html'));
});
app.get('/blog/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

// --- MongoDB Connection ---
const dbURI = process.env.MONGO_URI;
mongoose.connect(dbURI)
    .then(() => console.log('MongoDB से जुड़ गए!'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// --- 1. Shloka Model ---
const shlokaSchema = new mongoose.Schema({
    adhyay: { type: Number, required: true },
    shloka: { type: Number, required: true },
    slug: { type: String, index: true },
    text: { type: String, required: false },
    video_id: { type: String, required: true },
    likes: { type: Number, default: 0 }
});
shlokaSchema.pre('save', function (next) {
    this.slug = shlokaSlug(this.adhyay, this.shloka);
    next();
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
    slug: { type: String, index: true },
    content: { type: String, required: true },
    imageUrl: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 } // Likes added
});
blogSchema.pre('save', function (next) {
    this.slug = toSlug(this.title);
    next();
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
    slug: { type: String, index: true },
    description: { type: String },
    adhyay: { type: Number, required: true },
    imageUrl: { type: String },
    shlokas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shloka' }],
    createdAt: { type: Date, default: Date.now }
});
courseSchema.pre('save', function (next) {
    this.slug = toSlug(this.title);
    next();
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

// --- 8. Web push Notifications Setup ---
const pushTokenSchema = new mongoose.Schema({
    token: { type: String, unique: true },
    createdAt: { type: Date, default: Date.now }
});
const PushToken = mongoose.model('PushToken', pushTokenSchema);

// --- 9. Student/User Model ---
const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    daily_limit: { type: Number, default: DEFAULT_DAILY_LIMIT },
    used_today: { type: Number, default: 0 },
    last_reset_date: { type: String, default: getTodayDateString },
    ai_usage_count: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});
const Student = mongoose.model('Student', studentSchema);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FB_PROJECT_ID,
            clientEmail: process.env.FB_CLIENT_EMAIL,
            privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
    });
}

const DEFAULT_PUSH_URL = process.env.PUSH_DEFAULT_URL || 'https://warrioraaradhya.in';


// ===== AUTO PUSH HELPER FUNCTION =====
async function sendAutoPush(title, body, url = DEFAULT_PUSH_URL) {
    try {
        const safeUrl = cleanClientPath(url);
        const tokens = await PushToken.find();
        if (!tokens.length) {
            console.log('⚠️ No push tokens');
            return { sent: 0, failed: 0, removed: 0 };
        }

        let sent = 0;
        let failed = 0;
        let removed = 0;

        for (const t of tokens) {
            try {
                await admin.messaging().send({
                    token: t.token,
                    notification: { title, body },
                    data: { url: safeUrl },
                    webpush: {
                        fcmOptions: { link: safeUrl },
                        notification: {
                            title,
                            body,
                            icon: 'https://warrioraaradhya.in/favicon.png',
                            data: { url: safeUrl }
                        }
                    }
                });
                sent++;
            } catch (err) {

                // 🔴 THIS IS THE KEY FIX
                if (
                    err.code === 'messaging/registration-token-not-registered' ||
                    err.errorInfo?.code === 'messaging/registration-token-not-registered'
                ) {
                    console.log('🗑 Removing dead token');
                    await PushToken.deleteOne({ token: t.token });
                    removed++;
                } else {
                    // Fallback: try minimal payload if webpush block fails
                    try {
                        await admin.messaging().send({
                            token: t.token,
                            notification: { title, body },
                            data: { url: safeUrl }
                        });
                        sent++;
                        continue;
                    } catch (fallbackErr) {
                        console.error('Push error:', fallbackErr.message);
                    }
                }
                failed++;
            }
        }

        return { sent, failed, removed };
    } catch (err) {
        console.error('sendAutoPush fatal:', err.message);
        return { sent: 0, failed: 0, removed: 0 };
    }
}

async function ensureDailyLimitState(student) {
    const today = getTodayDateString();
    if (typeof student.daily_limit !== 'number' || student.daily_limit <= 0) {
        student.daily_limit = DEFAULT_DAILY_LIMIT;
    }
    if (typeof student.used_today !== 'number' || student.used_today < 0) {
        student.used_today = 0;
    }
    if (!student.last_reset_date) {
        student.last_reset_date = today;
    }
    if (student.last_reset_date !== today) {
        student.used_today = 0;
        student.last_reset_date = today;
    }
    await student.save();
    return student;
}

async function callGroqForSaarathi(message) {
    if (!process.env.GROQ_API_KEY) {
        return null;
    }

    const systemPrompt = [
        'You are GEETA SAARATHI. Reply in compassionate Hinglish.',
        'Always include all sections exactly with these headings:',
        '🔍 Manasik Avastha Vishleshan',
        '📖 Adhyay + Shlok Number',
        '🕉 Sanskrit Shlok',
        '📘 Hindi Meaning',
        '📗 English Meaning',
        '🪔 Practical Margdarshan',
        'Keep the guidance concise, practical, and spiritually grounded.'
    ].join('\n');

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.4,
            max_tokens: 700,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ]
        })
    });

    if (!response.ok) {
        return null;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    if (!ensureStructuredSections(content)) return null;
    return content;
}

// --- API Routes ---

// --- Admin Login ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ message: 'Galat Password!' });
    }
});

// --- Student Registration ---
app.post('/api/student/register', async (req, res) => {
    try {
        const { name, mobile, password } = req.body;
        const exists = await Student.findOne({ mobile });
        if (exists) return res.status(400).json({ message: 'Mobile number already registered' });

        const newStudent = new Student({
            name,
            mobile,
            password,
            daily_limit: DEFAULT_DAILY_LIMIT,
            used_today: 0,
            last_reset_date: getTodayDateString()
        });
        await newStudent.save();
        res.json({
            success: true,
            student: {
                userId: newStudent._id,
                name: newStudent.name,
                mobile: newStudent.mobile,
                daily_limit: newStudent.daily_limit,
                used_today: newStudent.used_today
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed' });
    }
});

// --- Student Login ---
app.post('/api/student/login', async (req, res) => {
    try {
        const { mobile, password } = req.body;
        const student = await Student.findOne({ mobile, password });
        if (!student) return res.status(401).json({ message: 'Invalid mobile or password' });
        await ensureDailyLimitState(student);
        res.json({
            success: true,
            student: {
                userId: student._id,
                name: student.name,
                mobile: student.mobile,
                daily_limit: student.daily_limit,
                used_today: student.used_today
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Login failed' });
    }
});

// --- Student Profile Update ---
app.put('/api/student/update', async (req, res) => {
    try {
        const { mobile, name, currentPassword, newPassword } = req.body;
        if (!mobile || !currentPassword) {
            return res.status(400).json({ message: 'Mobile and current password are required.' });
        }
        const student = await Student.findOne({ mobile });
        if (!student || student.password !== currentPassword) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        if (name && name.trim()) student.name = name.trim();
        if (newPassword && newPassword.trim()) student.password = newPassword.trim();

        await student.save();
        res.json({
            success: true,
            student: {
                userId: student._id,
                name: student.name,
                mobile: student.mobile,
                daily_limit: student.daily_limit,
                used_today: student.used_today
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Profile update failed' });
    }
});

// --- GEETA SAARATHI ---
app.post('/api/geeta-saarathi', async (req, res) => {
    try {
        const { message, userId } = req.body || {};
        if (!userId) {
            return res.status(401).json({ message: 'Login required', response: null });
        }
        if (!message || !String(message).trim()) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const student = await Student.findById(userId);
        if (!student) {
            return res.status(401).json({ message: 'Invalid user' });
        }

        await ensureDailyLimitState(student);

        const dailyLimit = Number(student.daily_limit || DEFAULT_DAILY_LIMIT);
        if (student.used_today >= dailyLimit) {
            return res.status(429).json({
                response: 'Aaj ka aapka margdarshan limit poora ho chuka hai. Kripya kal dobara prayas karein.',
                remaining_limit: 0,
                used_today: student.used_today,
                daily_limit: dailyLimit
            });
        }

        let responseText;
        let shouldConsumeLimit = true;
        if (isGreetingMessage(message)) {
            responseText = 'Namaste. Main Geeta Saarathi hoon. Aap apni samasya likhiye, main Gita ke adhar par margdarshan dunga.';
            shouldConsumeLimit = false;
        } else if (isAboutSaarathiMessage(message)) {
            responseText = aboutSaarathiResponse();
            shouldConsumeLimit = false;
        } else if (isCrisisMessage(message)) {
            responseText = crisisResponse();
        } else {
            responseText = await callGroqForSaarathi(message);
            if (!responseText) {
                responseText = [
                    '🔍 Manasik Avastha Vishleshan',
                    'Aap manasik uljhan aur bhavnaatmak dabav ke daur se guzar rahe hain.',
                    '',
                    '📖 Adhyay + Shlok Number',
                    'Bhagavad Gita 2.47',
                    '',
                    '🕉 Sanskrit Shlok',
                    'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।',
                    '',
                    '📘 Hindi Meaning',
                    'Aapka adhikar karm par hai, parinaam par nahi.',
                    '',
                    '📗 English Meaning',
                    'Your right is to action alone, never to the fruits.',
                    '',
                    '🪔 Practical Margdarshan',
                    'Aaj ke liye ek chhota nishchit karm chuniyega, use poore dhyan se kijiye, aur parinaam ka bhaar chhod dijiye.'
                ].join('\n');
            }
        }

        if (shouldConsumeLimit) {
            student.used_today += 1;
            student.ai_usage_count = Number(student.ai_usage_count || 0) + 1;
            await student.save();
        }

        return res.json({
            response: responseText,
            remaining_limit: Math.max(0, dailyLimit - student.used_today),
            used_today: student.used_today,
            daily_limit: dailyLimit,
            privacy_notice: 'Aapki samasya kisi server par save nahi ki jaati. Yeh vartalaap gopniya hai.'
        });
    } catch (err) {
        return res.status(500).json({ message: 'Saarathi temporarily unavailable' });
    }
});

app.post('/api/admin-update-limit', async (req, res) => {
    try {
        const { adminPassword, userId, new_limit } = req.body || {};
        if (adminPassword !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const limit = Number(new_limit);
        if (!Number.isInteger(limit) || limit <= 0) {
            return res.status(400).json({ message: 'new_limit must be a positive integer' });
        }

        const student = await Student.findByIdAndUpdate(
            userId,
            { daily_limit: limit },
            { new: true }
        );
        if (!student) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.json({
            success: true,
            userId: student._id,
            daily_limit: student.daily_limit,
            used_today: student.used_today
        });
    } catch {
        return res.status(500).json({ message: 'Limit update failed' });
    }
});

app.post('/api/reset-daily-limit', async (req, res) => {
    try {
        const { password, userId } = req.body || {};
        const cronSecret = req.headers['x-cron-secret'];
        const isAuthorized =
            password === process.env.ADMIN_PASSWORD ||
            (process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

        if (!isAuthorized) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const today = getTodayDateString();
        if (userId) {
            const student = await Student.findByIdAndUpdate(
                userId,
                { used_today: 0, last_reset_date: today },
                { new: true }
            );
            if (!student) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.json({ success: true, reset: 1, today });
        }

        const result = await Student.updateMany({}, { used_today: 0, last_reset_date: today });
        return res.json({ success: true, reset: result.modifiedCount || 0, today });
    } catch {
        return res.status(500).json({ message: 'Reset failed' });
    }
});

// Get detailed students with course progress (for admin)
app.get('/api/admin/detailed-students', async (req, res) => {
    try {
        const { password } = req.query;
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const students = await Student.find()
            .select('name mobile _id daily_limit used_today last_reset_date ai_usage_count')
            .sort({ createdAt: -1 });
        const courses = await Course.find().populate('shlokas');

        const detailedStudents = await Promise.all(students.map(async (student) => {
            // Get all progress for this student
            const progressRecords = await Progress.find({ mobile: student.mobile });

            const enrolledCourses = [];
            const passedCourses = [];

            for (const progress of progressRecords) {
                const course = courses.find(c => c._id.toString() === progress.courseId);
                if (!course) continue;

                const courseData = {
                    courseId: course._id,
                    courseTitle: course.title,
                    completedShlokas: progress.completed?.length || 0,
                    totalShlokas: course.shlokas?.length || 0
                };

                if (progress.quizPassed) {
                    passedCourses.push({
                        ...courseData,
                        quizScore: progress.quizScore || 0
                    });
                } else {
                    enrolledCourses.push(courseData);
                }
            }

            return {
                _id: student._id,
                name: student.name,
                mobile: student.mobile,
                daily_limit: student.daily_limit || DEFAULT_DAILY_LIMIT,
                used_today: student.used_today || 0,
                ai_usage_count: student.ai_usage_count || 0,
                last_reset_date: student.last_reset_date || getTodayDateString(),
                enrolledCourses,
                passedCourses
            };
        }));

        res.json(detailedStudents);
    } catch (err) {
        console.error('Detailed students error:', err);
        res.status(500).json({ message: 'Failed to fetch detailed students' });
    }
});


// Get all students (simple list)
app.get('/api/students', async (req, res) => {
    try {
        const { password } = req.query;
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const students = await Student.find().select('name mobile _id').sort({ createdAt: -1 });
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch students' });
    }
});


// Update student (admin can update name, mobile, password)
app.put('/api/admin/student/:id', async (req, res) => {
    try {
        const { adminPassword, name, mobile, password } = req.body;
        if (adminPassword !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if new mobile is already taken by another student
        if (mobile && mobile !== student.mobile) {
            const existingStudent = await Student.findOne({ mobile });
            if (existingStudent && existingStudent._id.toString() !== req.params.id) {
                return res.status(400).json({ message: 'Mobile number already registered to another student' });
            }

            // Update mobile in student record
            const oldMobile = student.mobile;
            student.mobile = mobile.trim();

            // Update mobile in all progress records
            await Progress.updateMany(
                { mobile: oldMobile },
                { mobile: mobile.trim() }
            );
        }

        if (name && name.trim()) {
            student.name = name.trim();
        }

        if (password && password.trim()) {
            student.password = password.trim();
        }

        await student.save();

        res.json({ success: true, student: { name: student.name, mobile: student.mobile } });
    } catch (err) {
        console.error('Student update error:', err);
        res.status(500).json({ message: 'Update failed' });
    }
});

// Delete student
app.delete('/api/admin/student/:id', async (req, res) => {
    try {
        const { password } = req.body;
        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        await Student.findByIdAndDelete(req.params.id);
        // Also delete related progress
        await Progress.deleteMany({ mobile: (await Student.findById(req.params.id))?.mobile });

        res.json({ success: true, message: 'Student deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed' });
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

// Single shloka slug se fetch karein (shloka.html ke liye) - PRD v6.2
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
            slug: shlokaSlug(req.body.adhyay, req.body.shloka),
            text: req.body.text,
            video_id: req.body.video_id
        });
        await newShloka.save();

        // 🔔 auto push (NON-BLOCKING)
        const autoPush = await sendAutoPush(
            'New Gita Shloka Added 🙏',
            `Adhyay ${newShloka.adhyay}, Shloka ${newShloka.shloka}`,
            `/adhyay-${newShloka.adhyay}/shlok-${newShloka.shloka}`
        );

        const payload = newShloka.toObject();
        payload.autoPush = autoPush;
        res.json(payload);

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
            slug: shlokaSlug(req.body.adhyay, req.body.shloka),
            text: req.body.text,
            video_id: req.body.video_id
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

// --- 'Settings' APIs (Logo, Social Links, About) ---
app.get('/api/settings', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        let settings = await SiteContent.findOne({ key: 'siteSettings' });
        if (!settings) {
            settings = new SiteContent({
                key: 'siteSettings',
                content: JSON.stringify({
                    aboutText: 'Welcome to Gitadhya!',
                    logoUrl: '/favicon.png',
                    aboutImageUrl: '/favicon.png',
                    personalLink: '',
                    personalLinkLogo: '',
                    social: { instagram: '', youtube: '', twitter: '', facebook: '' },
                    adhyayTotals: {},
                    courseStatusOverrides: {}
                }),
                imageUrl: '/favicon.png'
            });
            await settings.save();
        }
        res.json(JSON.parse(settings.content));
    } catch (err) {
        res.status(500).json({ message: 'Cannot fetch settings' });
    }
});

app.post('/api/settings', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const {
            aboutText,
            logoUrl,
            aboutImageUrl,
            personalLink,
            personalLinkLogo,
            social,
            adhyayTotals,
            courseStatusOverrides
        } = req.body;
        const settingsData = {
            aboutText,
            logoUrl,
            aboutImageUrl,
            personalLink,
            personalLinkLogo,
            social,
            adhyayTotals,
            courseStatusOverrides
        };
        await SiteContent.findOneAndUpdate(
            { key: 'siteSettings' },
            { content: JSON.stringify(settingsData), imageUrl: logoUrl },
            { upsert: true }
        );
        res.json({ success: true, message: 'Settings updated!' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating settings' });
    }
});

// Backward compatibility for old "About" calls
app.get('/api/about', async (req, res) => {
    try {
        let settings = await SiteContent.findOne({ key: 'siteSettings' });
        if (!settings) return res.json({ content: 'Welcome!' });
        const data = JSON.parse(settings.content);
        res.json({ content: data.aboutText, imageUrl: data.logoUrl });
    } catch (err) { res.status(500).json({ message: 'Error' }); }
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
        const autoPush = await sendAutoPush(
            'New Artwork Added 🎨',
            newArtwork.title
        );
        const payload = newArtwork.toObject();
        payload.autoPush = autoPush;
        res.status(201).json(payload);
    } catch (err) {
        res.status(500).json({ message: 'Artwork jodne mein error' });
    }
});
app.put('/api/artwork/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const { id } = req.params;
        const updatedArtwork = await Artwork.findByIdAndUpdate(id, {
            title: req.body.title,
            imageUrl: req.body.imageUrl
        }, { new: true });
        res.json(updatedArtwork);
    } catch (err) {
        res.status(500).json({ message: 'Artwork update karne mein error' });
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

// Blog post fetch by ID
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

// Migration endpoint: Add missing slugs to existing blog posts
app.post('/api/blog', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Password galat hai' });
    }
    try {
        const newPost = new Blog({
            title: req.body.title,
            slug: toSlug(req.body.title),
            content: req.body.content,
            imageUrl: req.body.imageUrl || null
        });
        await newPost.save();
        const autoPush = await sendAutoPush(
            'New Blog Published ✍️',
            newPost.title,
            `/blog/${newPost.slug || toSlug(newPost.title)}`
        );
        const payload = newPost.toObject();
        payload.autoPush = autoPush;
        res.status(201).json(payload);
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
            slug: toSlug(req.body.title),
            content: req.body.content,
            imageUrl: req.body.imageUrl || null
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
// UPDATE COURSE
app.put('/api/courses/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const { id } = req.params;

        await Course.findByIdAndUpdate(id, {
            title: req.body.title,
            slug: toSlug(req.body.title),
            description: req.body.description,
            adhyay: Number(req.body.adhyay),
            shlokas: req.body.shlokas,
            imageUrl: req.body.imageUrl
        });

        res.json({ success: true });
    } catch (err) {
        console.error('COURSE UPDATE ERROR:', err);
        res.status(500).json({ success: false });
    }
});

app.get('/api/courses/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('shlokas');
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: 'Course fetch failed' });
    }
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
            slug: toSlug(req.body.title),
            description: req.body.description,
            adhyay: Number(req.body.adhyay),
            shlokas: req.body.shlokas, // array of shloka IDs
            imageUrl: req.body.imageUrl
        });
        await course.save();
        const autoPush = await sendAutoPush(
            'New Course Launched 📚',
            `${course.title} (Adhyay ${course.adhyay}) – Complete it and get certified!`,
            `/course/${course.slug || toSlug(course.title)}`
        );

        const payload = course.toObject();
        payload.autoPush = autoPush;
        res.status(201).json(payload);
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

app.post('/api/courses/:id/enroll', async (req, res) => {
    try {
        const { mobile } = req.body || {};
        if (!mobile) {
            return res.status(400).json({ success: false, message: 'mobile is required' });
        }

        const student = await Student.findOne({ mobile });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const course = await Course.findById(req.params.id).select('title');
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const existing = await Progress.findOne({ mobile, courseId: req.params.id });
        if (!existing) {
            await Progress.create({
                mobile,
                courseId: req.params.id,
                completed: [],
                enrolled: true,
                enrolledAt: new Date()
            });
            return res.json({
                success: true,
                enrolled: true,
                newlyEnrolled: true,
                courseName: course.title
            });
        }

        if (!existing.enrolled) {
            existing.enrolled = true;
            existing.enrolledAt = existing.enrolledAt || new Date();
            await existing.save();
        }

        return res.json({
            success: true,
            enrolled: true,
            newlyEnrolled: false,
            courseName: course.title
        });
    } catch {
        return res.status(500).json({ success: false, message: 'Enrollment failed' });
    }
});

app.get('/api/shloka/by-reference/:adhyay/:shloka', async (req, res) => {
    try {
        const adhyay = Number(req.params.adhyay);
        const shlokaNo = Number(req.params.shloka);
        const shloka = await Shloka.findOne({ adhyay, shloka: shlokaNo });
        if (!shloka) {
            return res.status(404).json({ message: 'Shloka not found' });
        }
        res.json(shloka);
    } catch (err) {
        res.status(500).json({ message: 'Shloka laane mein error' });
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
        let autoEnrolled = false;

        let progress = await Progress.findOne({ mobile, courseId });

        if (!progress) {
            progress = new Progress({
                mobile,
                courseId,
                completed,
                enrolled: true,
                enrolledAt: new Date()
            });
            autoEnrolled = true;
        } else {
            progress.completed = [
                ...new Set([...progress.completed, ...completed])
            ];
            if (!progress.enrolled) {
                progress.enrolled = true;
                progress.enrolledAt = progress.enrolledAt || new Date();
                autoEnrolled = true;
            }
        }

        await progress.save();
        let courseName = '';
        if (autoEnrolled) {
            const course = await Course.findById(courseId).select('title');
            courseName = course?.title || '';
        }
        return res.json({ success: true, autoEnrolled, courseName });

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
    const { mobile, courseId, score, passed } = req.body;

    await Progress.findOneAndUpdate(
        { mobile, courseId },
        {
            quizPassed: passed,
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

        if (!mobile || !courseTitle) {
            return res.status(400).send('Missing data');
        }

        // 🔥 ONLY READ FROM DB
        const cert = await Certificate.findOne({ mobile, courseTitle });

        if (!cert) {
            return res.status(404).send('Certificate request not found');
        }

        const fs = require('fs');
        const path = require('path');

        let html = fs.readFileSync(
            path.join(__dirname, 'public/certificate.html'),
            'utf8'
        );

        html = html
            .replace('{{NAME}}', cert.name)
            .replace('{{COURSE}}', cert.courseTitle)
            .replace('{{EMAIL}}', cert.email || '')
            .replace('{{LANG}}', cert.language || 'en');

        // ✅ ONLY SEND HTML
        res.send(html);

    } catch (err) {
        console.error('Certificate error:', err);
        res.status(500).send('Certificate error');
    }
});

app.post('/api/certificate/request', async (req, res) => {
    try {
        const { name, email, mobile, courseTitle, language } = req.body;

        const exists = await Certificate.findOne({ mobile, courseTitle });
        if (exists) {
            return res.status(409).json({
                success: false,
                message: 'Certificate request already submitted'
            });
        }

        await Certificate.create({
            name,
            email,
            mobile,
            courseTitle,
            language,
            status: 'pending'
        });

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Failed to submit certificate request'
        });
    }
});

// ================= CERTIFICATES LIST (ADMIN) =================

app.get('/api/certificates', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const certificates = await Certificate.find().sort({ createdAt: -1 });
        res.json(Array.isArray(certificates) ? certificates : []);
    } catch (err) {
        console.error('CERTIFICATE LOAD ERROR:', err);
        res.status(500).json([]);
    }
});

// DELETE CERTIFICATE
app.delete('/api/certificates/:id', async (req, res) => {
    try {
        await Certificate.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// CREATE CERTIFICATE (ADMIN)
app.post('/api/certificates/create', async (req, res) => {
    try {
        const { studentId, name, mobile, courseTitle, percentage, language, certificateId, password } = req.body;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const allProgress = await Progress.find({ mobile: student.mobile });
        if (!allProgress.length) {
            return res.status(400).json({ success: false, message: 'Student is not enrolled in any course' });
        }
        const enrolledCourseIds = allProgress.map((p) => p.courseId).filter(Boolean);
        const enrolledCourses = await Course.find({ _id: { $in: enrolledCourseIds } }).select('title').lean();
        const enrolledTitles = new Set(enrolledCourses.map((c) => c.title));
        if (!enrolledTitles.has(courseTitle)) {
            return res.status(400).json({ success: false, message: 'Selected course is not enrolled for this student' });
        }

        const existing = await Certificate.findOne({ mobile: student.mobile, courseTitle });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Certificate already exists' });
        }

        const generatedId = certificateId || makeCertificateId(courseTitle, student.mobile);

        await Certificate.create({
            name: name || student.name,
            mobile: student.mobile,
            courseTitle,
            certificateId: generatedId,
            percentage,
            language,
            status: 'approved' // Admin created certificates are auto-approved
        });

        res.json({ success: true, message: 'Certificate created', certificateId: generatedId });
    } catch (err) {
        console.error("Manual cert create error:", err);
        res.status(500).json({ success: false, message: 'Failed to create certificate' });
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

app.put('/api/certificates/approve/:id', async (req, res) => {
    await Certificate.findByIdAndUpdate(req.params.id, {
        status: 'approved'
    });
    res.json({ success: true });
});

//--- Notification Token Save API ---
app.post('/api/push/register', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false });

        await PushToken.updateOne(
            { token },
            { token },
            { upsert: true }
        );

        res.json({ success: true });
    } catch {
        res.status(500).json({ success: false });
    }
});

app.get('/api/push/count', async (req, res) => {
    const count = await PushToken.countDocuments();
    res.json({ count });
});

app.post('/api/push/send', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const { title, body, url } = req.body;
    const safeUrl = cleanClientPath(url || '/');
    const tokens = await PushToken.find();

    let sent = 0;
    let failed = 0;
    let removed = 0;
    for (let t of tokens) {
        try {
            await admin.messaging().send({
                token: t.token,
                notification: { title, body },
                data: { url: safeUrl },
                webpush: {
                    fcmOptions: { link: safeUrl },
                    notification: {
                        title,
                        body,
                        icon: 'https://warrioraaradhya.in/favicon.png',
                        data: { url: safeUrl }
                    }
                }
            });
            sent++;
        } catch (err) {
            if (
                err.code === 'messaging/registration-token-not-registered' ||
                err.errorInfo?.code === 'messaging/registration-token-not-registered'
            ) {
                await PushToken.deleteOne({ token: t.token });
                removed++;
            }
            failed++;
        }
    }

    res.json({ success: true, sent, failed, removed });
});

// --- ADMIN ACCESS APIs (NEW) ---

// 1. Get All Students List
app.get('/api/admin/detailed-students', async (req, res) => {
    if (req.query.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json([]);
    }
    try {
        const students = await Student.find().sort({ createdAt: -1 }).lean();
        // Enrich with progress info
        const enriched = await Promise.all(students.map(async (s) => {
            const progress = await Progress.find({ mobile: s.mobile });
            return {
                ...s,
                coursesEnrolled: progress.length,
                quizzesPassed: progress.filter(p => p.quizPassed).length,
                lastActive: progress.length > 0 ? progress.sort((a, b) => b.updatedAt - a.updatedAt)[0].updatedAt : s.createdAt
            };
        }));
        res.json(enriched);
    } catch (err) {
        res.status(500).json([]);
    }
});

// 2. Comprehensive Admin Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [
            shlokaCount,
            courseCount,
            blogCount,
            artCount,
            pendingTestimonials,
            pendingCerts,
            studentCount,
            shlokaLikes,
            blogLikes,
            artLikes
        ] = await Promise.all([
            Shloka.countDocuments(),
            Course.countDocuments(),
            Blog.countDocuments(),
            Artwork.countDocuments(),
            Testimonial.countDocuments({ status: 'pending' }),
            Certificate.countDocuments({ status: 'pending' }),
            Student.countDocuments(),
            Shloka.aggregate([{ $group: { _id: null, total: { $sum: "$likes" } } }]),
            Blog.aggregate([{ $group: { _id: null, total: { $sum: "$likes" } } }]),
            Artwork.aggregate([{ $group: { _id: null, total: { $sum: "$likes" } } }])
        ]);

        const totalLikes = (shlokaLikes[0]?.total || 0) + (blogLikes[0]?.total || 0) + (artLikes[0]?.total || 0);

        res.json({
            stats: [
                { label: 'Total Shlokas', value: shlokaCount, icon: '📖' },
                { label: 'Courses Active', value: courseCount, icon: '📚' },
                { label: 'Enrolled Students', value: studentCount, icon: '🎓' },
                { label: 'Total Likes ❤️', value: totalLikes, icon: '❤️' },
                { label: 'Artworks', value: artCount, icon: '🎨' }
            ],
            alerts: {
                testimonials: pendingTestimonials,
                certificates: pendingCerts
            }
        });
    } catch (err) {
        console.error("Stats error", err);
        res.json({ stats: [], alerts: { testimonials: 0, certificates: 0 } });
    }
});

app.get('/api/admin/analytics', async (req, res) => {
    if (req.query.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const [students, progresses, courses, shlokas] = await Promise.all([
            Student.find().select('name mobile ai_usage_count daily_limit used_today').lean(),
            Progress.find().lean(),
            Course.find().populate('shlokas').lean(),
            Shloka.find().select('adhyay shloka').lean()
        ]);

        const courseById = {};
        courses.forEach((course) => {
            courseById[String(course._id)] = course;
        });

        const studentWise = students.map((student) => {
            const mine = progresses.filter((p) => p.mobile === student.mobile);
            const completionPercentages = mine.map((p) => {
                const course = courseById[p.courseId];
                const total = course?.shlokas?.length || 0;
                const done = Array.isArray(p.completed) ? p.completed.length : 0;
                return total > 0 ? Math.round((done / total) * 100) : 0;
            });
            const averageCompletion = completionPercentages.length
                ? Math.round(completionPercentages.reduce((a, b) => a + b, 0) / completionPercentages.length)
                : 0;
            return {
                name: student.name,
                mobile: student.mobile,
                ai_usage_count: Number(student.ai_usage_count || 0),
                used_today: Number(student.used_today || 0),
                daily_limit: Number(student.daily_limit || DEFAULT_DAILY_LIMIT),
                shlok_views: mine.reduce((sum, p) => sum + (p.completed?.length || 0), 0),
                course_completion_percent: averageCompletion
            };
        });

        const shlokViewMap = {};
        progresses.forEach((progress) => {
            (progress.completed || []).forEach((shlokaId) => {
                const key = String(shlokaId);
                shlokViewMap[key] = (shlokViewMap[key] || 0) + 1;
            });
        });

        const shlokWise = shlokas
            .map((s) => ({
                shloka_id: s._id,
                adhyay: s.adhyay,
                shloka: s.shloka,
                views: shlokViewMap[String(s._id)] || 0,
                listens: shlokViewMap[String(s._id)] || 0
            }))
            .sort((a, b) => b.views - a.views);

        const courseWise = courses.map((course) => {
            const myProgress = progresses.filter((p) => p.courseId === String(course._id) && p.enrolled);
            const enrolled = myProgress.length;
            const completed = myProgress.filter((p) => p.quizPassed).length;
            return {
                course_id: course._id,
                title: course.title,
                enrollment_count: enrolled,
                completion_rate: enrolled ? Math.round((completed / enrolled) * 100) : 0
            };
        });

        res.json({
            student_wise: studentWise,
            shlok_wise: shlokWise,
            course_wise: courseWise
        });
    } catch (err) {
        res.status(500).json({ message: 'Analytics fetch failed' });
    }
});

// --- V2 Admin Student Endpoints ---
app.get('/api/admin/detailed-students-v2', async (req, res) => {
    if (req.query.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json([]);
    }
    try {
        const students = await Student.find().sort({ createdAt: -1 }).lean();
        const allProgress = await Progress.find().lean();
        const allCourses = await Course.find().select('title adhyay').lean();

        const courseMap = {};
        allCourses.forEach(c => courseMap[c._id.toString()] = c);

        const progressByMobile = {};
        allProgress.forEach(p => {
            if (!progressByMobile[p.mobile]) progressByMobile[p.mobile] = [];
            progressByMobile[p.mobile].push(p);
        });

        const enriched = students.map(s => {
            const myProgress = progressByMobile[s.mobile] || [];
            const detailedCourses = myProgress.map(p => {
                const c = courseMap[p.courseId];
                return {
                    courseId: p.courseId,
                    title: c ? c.title : 'Unknown Course',
                    quizPassed: p.quizPassed
                };
            });

            return {
                ...s,
                coursesEnrolledCount: detailedCourses.length,
                quizzesPassedCount: detailedCourses.filter(d => d.quizPassed).length,
                detailedCourses: detailedCourses,
                lastActive: myProgress.length > 0 ? myProgress.sort((a, b) => b.updatedAt - a.updatedAt)[0].updatedAt : s.createdAt
            };
        });
        res.json(enriched);
    } catch (err) {
        console.error("Detailed stud v2 error:", err);
        res.status(500).json([]);
    }
});

app.put('/api/admin/student/:id', async (req, res) => {
    if (req.body.adminPassword !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        delete updates.adminPassword;
        await Student.findByIdAndUpdate(id, updates);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/admin/student/:id', async (req, res) => {
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const { id } = req.params;
        await Student.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});


// --- Security Headers Middleware ---
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});

// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} par chal raha hai`);
});

// Vercel ke liye zaroori
module.exports = app;


