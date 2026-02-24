const { connectDb, getTodayInIST, parseBody } = require('./_lib/db');
const Student = require('../models/Student');

const DEFAULT_DAILY_LIMIT = 3;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const WINDOW_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const MAX_TOKENS_PER_WINDOW = 1200; // Token limit per window

const GREETINGS = new Set(['hi', 'hello', 'namaste', 'namaskar', 'hare krishna']);

// ✅ Forbidden scripture references (non-Bhagavad Gita)
const FORBIDDEN_TERMS = new Set([
    'yoga sutra', 'yogasutra', 'patanjali',
    'upanishad', 'upanishads', 'vedantas', 'vedanta',
    'rigveda', 'yajurveda', 'samaveda', 'atharvaveda',
    'brahma', 'brahmin', 'brahma sutra', 'brahmasutra'
].map(x => x.toLowerCase()));

function normalize(s = '') {
    return String(s).trim().toLowerCase();
}

function isCrisisMessage(message = '') {
    const t = normalize(message);
    return [
        'suicide', 'self harm', 'kill myself', 'end my life', 'want to die',
        'khudkushi', 'marna chahta', 'marna chahti', 'apni jaan'
    ].some((k) => t.includes(k));
}

function isAboutSaarathi(message = '') {
    const t = normalize(message);
    return [
        'who are you',
        'about you',
        'tum kaun',
        'aap kaun',
        'geeta saarathi kya',
        'what can you do',
        'tum kya karte ho',
        'aap kya karte ho',
        'privacy',
        'data save'
    ].some((k) => t.includes(k));
}

async function syncDailyLimit(student) {
    const today = getTodayInIST();
    if (!student.last_reset_date || student.last_reset_date !== today) {
        student.last_reset_date = today;
        student.used_today = 0;
        // Reset window when day resets
        student.current_window_id = null;
        student.window_start_time = null;
        student.window_token_used = 0;
        student.window_active = false;
    }
    if (!Number.isFinite(student.daily_limit) || student.daily_limit <= 0) {
        student.daily_limit = DEFAULT_DAILY_LIMIT;
    }
    if (!Number.isFinite(student.used_today) || student.used_today < 0) {
        student.used_today = 0;
    }
    await student.save();
}

// ✅ Window Management (PRD v6.1)
function generateWindowId() {
    return `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function checkAndResetWindow(student) {
    const now = Date.now();
    const windowExpired = student.window_start_time && 
        (now - new Date(student.window_start_time).getTime()) > WINDOW_TIMEOUT_MS;
    
    if (!student.window_active || windowExpired) {
        // Window is inactive or expired, create new one
        student.current_window_id = generateWindowId();
        student.window_start_time = new Date();
        student.window_token_used = 0;
        student.window_active = true;
        await student.save();
        return { isNewWindow: true, windowId: student.current_window_id };
    }
    return { isNewWindow: false, windowId: student.current_window_id };
}

// ✅ Token Counting (Estimation: ~4 chars = 1 token)
function estimateTokens(text = '') {
    return Math.ceil(String(text).length / 4);
}

// ✅ Scripture Validation Layer (Strict Bhagavad Gita only)
function validateScripture(text = '') {
    const t = normalize(text);
    for (const term of FORBIDDEN_TERMS) {
        if (t.includes(term)) {
            return false; // Contains forbidden scripture
        }
    }
    return true; // Only Bhagavad Gita references

function buildGreeting() {
    return 'Namaste. Main Geeta Saarathi hoon. Aap apni samasya likhiye, main Gita ke adhar par margdarshan dunga.';
}

function buildCrisisResponse() {
    return [
        '🔍 Manasik Avastha Vishleshan',
        'Aap gehri mansik peeda mein lag rahe hain. Kripya turant support lijiye.',
        '',
        '📖 Adhyay + Shlok Number',
        'Bhagavad Gita 2.14',
        '',
        '🕉 Full Sanskrit Shlok (complete verse)',
        'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः। आगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत।।',
        '',
        '📘 Hindi Meaning',
        'Sukh-dukh aate-jate aur anitya hain; is samay ko dhairya se paar kijiye.',
        '',
        '📗 English Meaning',
        'Pleasure and pain are temporary; endure this phase with steadiness.',
        '',
        '🪔 Practical Margdarshan',
        'Abhi turant Tele-MANAS: 14416 ya 1-800-891-4416 par call karein. Kisi trusted vyakti ko abhi batayein.'
    ].join('\n');
}

function buildAboutSaarathiResponse() {
    return [
        'Main Geeta Saarathi hoon, Bhagavad Gita adharit guidance tool.',
        'Main therapy replacement nahi hoon, sirf margdarshan ke liye hoon.',
        'Aapka chat content database me save nahi hota.',
        'Sirf daily usage counter (used_today / daily_limit) maintain hota hai.',
        'Aap apni paristhiti likhen, main Gita ke sandarbh me structured margdarshan dunga.'
    ].join('\n');
}

function fallbackStructuredResponse() {
    return [
        '🔍 Manasik Avastha Vishleshan',
        'Aap manasik asantulan aur parinaam ki chinta se prabhavit hain.',
        '',
        '📖 Adhyay + Shlok Number',
        'Bhagavad Gita 2.47',
        '',
        '🕉 Full Sanskrit Shlok (complete verse)',
        'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि।।',
        '',
        '📘 Hindi Meaning',
        'Aapka adhikar karm par hai, phal par nahi.',
        '',
        '📗 English Meaning',
        'You are entitled to action, not to the fruits of action.',
        '',
        '🪔 Practical Margdarshan',
        'Aaj ke liye ek nishchit karm chun kar bina chinta ke poora kijiye, parinaam ko chhod dijiye.'
    ].join('\n');
}

function hasAllSections(text = '') {
    return [
        '🔍 Manasik Avastha Vishleshan',
        '📖 Adhyay + Shlok Number',
        '🕉 Full Sanskrit Shlok (complete verse)',
        '📘 Hindi Meaning',
        '📗 English Meaning',
        '🪔 Practical Margdarshan'
    ].every((h) => text.includes(h));
}

async function askGroq(userMessage) {
    if (!process.env.GROQ_API_KEY) return null;
    const systemPrompt = [
        'You are Geeta Saarathi.',
        'Always reply in respectful Hinglish.',
        'For guidance replies, include these exact sections only once:',
        '🔍 Manasik Avastha Vishleshan',
        '📖 Adhyay + Shlok Number',
        '🕉 Full Sanskrit Shlok (complete verse)',
        '📘 Hindi Meaning',
        '📗 English Meaning',
        '🪔 Practical Margdarshan',
        'Sanskrit verse must be full, not partial.'
    ].join('\n');

    const r = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.3,
            max_tokens: 700,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ]
        })
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
}

module.exports = async (req, res) => {
    if (!['GET', 'POST'].includes(req.method)) {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    try {
        await connectDb();
        const body = parseBody(req);
        const userId = (req.method === 'GET' ? req.query.userId : body.userId) || '';
        if (!userId) {
            return res.status(401).json({ message: 'Login required' });
        }

        const student = await Student.findById(userId);
        if (!student) {
            return res.status(401).json({ message: 'Invalid user' });
        }
        await syncDailyLimit(student);

        if (req.method === 'GET') {
            const dailyLimit = Number(student.daily_limit || DEFAULT_DAILY_LIMIT);
            const remaining = Math.max(0, dailyLimit - Number(student.used_today || 0));
            return res.json({
                remaining_limit: remaining,
                daily_limit: dailyLimit,
                privacy_notice: 'Aapki samasya kisi server par save nahi ki jaati. Yeh vartalaap gopniya hai.'
            });
        }

        const message = String(body.message || '').trim();
        if (!message) {
            return res.status(400).json({ message: 'message is required' });
        }

        const dailyLimit = Number(student.daily_limit || DEFAULT_DAILY_LIMIT);
        if (student.used_today >= dailyLimit) {
            return res.status(429).json({
                response: 'Daily Limit Complete',
                remaining_limit: 0,
                daily_limit: dailyLimit
            });
        }

        // ✅ WINDOW-BASED COUNTING (PRD v6.1)
        const windowInfo = await checkAndResetWindow(student);
        const inputTokens = estimateTokens(message);
        const currentWindowTokens = student.window_token_used || 0;
        
        // Check if adding this input would exceed window limit
        if (currentWindowTokens + inputTokens > MAX_TOKENS_PER_WINDOW) {
            return res.json({
                response: 'Is vartalaap ki seema poori ho gayi hai. Aap naya margdarshan prarambh kar sakte hain.',
                window_expired: true,
                current_tokens: currentWindowTokens,
                max_tokens: MAX_TOKENS_PER_WINDOW,
                remaining_limit: Math.max(0, dailyLimit - student.used_today),
                daily_limit: dailyLimit
            });
        }

        let responseText = '';
        let shouldConsumeLimit = true;
        const lower = normalize(message);
        if (GREETINGS.has(lower)) {
            responseText = buildGreeting();
            shouldConsumeLimit = false;
        } else if (isAboutSaarathi(message)) {
            responseText = buildAboutSaarathiResponse();
            shouldConsumeLimit = false;
        } else if (isCrisisMessage(message)) {
            responseText = buildCrisisResponse();
        } else {
            const groqResponse = await askGroq(message);
            responseText = groqResponse && hasAllSections(groqResponse)
                ? groqResponse
                : fallbackStructuredResponse();
        }

        // ✅ SCRIPTURE VALIDATION LAYER (PRD v6.1)
        if (!validateScripture(responseText)) {
            responseText = fallbackStructuredResponse();
        }

        // ✅ COUNT TOKENS IN WINDOW
        const outputTokens = estimateTokens(responseText);
        const totalWindowTokens = currentWindowTokens + inputTokens + outputTokens;
        
        if (shouldConsumeLimit) {
            student.used_today += 1;
            student.ai_usage_count = Number(student.ai_usage_count || 0) + 1;
        }
        
        // Update window token count
        student.window_token_used = totalWindowTokens;
        await student.save();

        const remaining = Math.max(0, dailyLimit - student.used_today);
        return res.json({
            response: responseText,
            remaining_limit: remaining,
            daily_limit: dailyLimit,
            window_status: {
                window_id: student.current_window_id,
                tokens_used: totalWindowTokens,
                max_tokens: MAX_TOKENS_PER_WINDOW,
                is_new_window: windowInfo.isNewWindow
            }
        });
    } catch (e) {
        return res.status(500).json({ message: 'Geeta Saarathi unavailable' });
    }
};
