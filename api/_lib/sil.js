/**
 * 🔥 SHLOK INTELLIGENCE LAYER (SIL)
 * 
 * Handles intelligent verse selection with:
 * - Emotion-based matching
 * - Repetition prevention
 * - User history tracking
 * - Priority scoring
 */

const Shloka = require('../../models/Shloka');
const { classifyEmotion, getPrimaryEmotion, getEmotionsAboveThreshold } = require('./emotion-classifier');

// Global repetition counter (in production, use Redis for scalability)
let globalVerseUsageCount = {};
let lastThreeGlobalVerses = [];

const MAX_USAGE_PER_DAY_PER_USER = 1;
const MAX_GLOBAL_USAGE_BEFORE_DEPRIORITIZE = 50;
const WINDOW_REPETITION_PENALTY = 10;
const TODAY_REPETITION_PENALTY = 5;
const LAST_THREE_GLOBAL_PENALTY = 3;

/**
 * Format verse as "adhyay.shlok" (e.g., "2.47")
 */
function formatVerseKey(adhyay, shlok) {
    return `${adhyay}.${shlok}`;
}

/**
 * Parse verse key back to {adhyay, shlok}
 */
function parseVerseKey(verseKey) {
    const [adhyay, shlok] = String(verseKey).split('.').map(Number);
    return { adhyay, shlok };
}

/**
 * Check if 2.47 (Karma Yoga) has been overused
 */
function is247Overused(student) {
    const verseKey = '2.47';
    const usageCount = student.shlok_frequency_map?.get?.(verseKey) || 0;
    return usageCount >= MAX_USAGE_PER_DAY_PER_USER;
}

/**
 * Calculate verse score for ranking
 * Higher score = better match for current context
 */
function calculateVerseScore(verse, emotions, student) {
    let score = verse.priority * 10; // Base score from priority (1-10 -> 10-100)
    
    // Boost if verse matches user's emotions
    if (verse.tags && verse.tags.length > 0) {
        const matchingTags = verse.tags.filter(tag => 
            emotions.some(e => e.emotion === tag || tag.includes(e.emotion))
        );
        score += matchingTags.length * 20; // Each matching tag = +20 points
    }
    
    // Penalize recently used verses
    const verseKey = formatVerseKey(verse.adhyay, verse.shloka);
    
    if (student && student.used_shlok_this_window?.includes(verseKey)) {
        score -= WINDOW_REPETITION_PENALTY * 100; // Heavy penalty for same window
    }
    
    if (student && student.used_shlok_today?.includes(verseKey)) {
        score -= TODAY_REPETITION_PENALTY * 100; // Penalty for today
    }
    
    if (lastThreeGlobalVerses.includes(verseKey)) {
        score -= LAST_THREE_GLOBAL_PENALTY * 100; // Penalty for recent global usage
    }
    
    // Penalize if globally overused
    const globalUsage = globalVerseUsageCount[verseKey] || 0;
    if (globalUsage > MAX_GLOBAL_USAGE_BEFORE_DEPRIORITIZE) {
        score -= Math.min(globalUsage - MAX_GLOBAL_USAGE_BEFORE_DEPRIORITIZE, 100);
    }
    
    // Special: Hard restriction on 2.47
    if (verseKey === '2.47' && is247Overused(student)) {
        score -= 1000; // Make it virtually unusable if quota exhausted
    }
    
    return Math.max(0, score); // Never return negative score
}

/**
 * Get eligible verses for given emotions
 * Filters by:
 * - Emotional match
 * - Recency
 * - Global usage balance
 */
async function getEligibleVerses(emotions, student, limit = 10) {
    if (!emotions || emotions.length === 0) {
        emotions = [{ emotion: 'general', score: 1, confidence: 0.5 }];
    }
    
    try {
        // Build query to fetch verses matching emotions
        const emotionTags = emotions.map(e => e.emotion);
        
        const verses = await Shloka.find({
            $or: [
                { tags: { $in: emotionTags } },
                { category: { $in: emotionTags } },
                { tags: { $in: ['general'] } } // Fallback to general
            ]
        }).limit(100); // Get more than needed
        
        if (!verses || verses.length === 0) {
            return [];
        }
        
        // Score and rank verses
        const rankedVerses = verses
            .map(v => ({
                verse: v,
                score: calculateVerseScore(v, emotions, student)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        
        return rankedVerses.map(r => r.verse);
    } catch (err) {
        console.error('❌ Error fetching eligible verses:', err.message);
        return [];
    }
}

/**
 * Select best verse from eligible list
 * Incorporates emotional match + recency + global balance
 */
async function selectBestVerse(userMessage, student) {
    try {
        // Step 1: Classify emotions
        const emotions = classifyEmotion(userMessage);
        console.log(`📊 Emotions detected:`, emotions);
        
        // Step 2: Get eligible verses
        const eligibleVerses = await getEligibleVerses(emotions, student, 10);
        
        if (!eligibleVerses || eligibleVerses.length === 0) {
            console.warn('⚠️ No eligible verses found, using fallback');
            return getFallbackVerse();
        }
        
        // Step 3: Select best verse from eligible list
        const bestVerse = eligibleVerses[0];
        const verseKey = formatVerseKey(bestVerse.adhyay, bestVerse.shloka);
        
        console.log(`✅ Selected verse: ${verseKey} (${bestVerse.text})`);
        
        return {
            adhyay: bestVerse.adhyay,
            shloka: bestVerse.shloka,
            text: bestVerse.text,
            key: verseKey,
            emotions: emotions
        };
    } catch (err) {
        console.error('❌ Error in selectBestVerse:', err.message);
        return getFallbackVerse();
    }
}

/**
 * Update student's verse usage tracking
 */
async function updateVerseTracking(student, verseKey) {
    try {
        // Update window usage
        if (!student.used_shlok_this_window) {
            student.used_shlok_this_window = [];
        }
        if (!student.used_shlok_this_window.includes(verseKey)) {
            student.used_shlok_this_window.push(verseKey);
        }
        
        // Update daily usage
        if (!student.used_shlok_today) {
            student.used_shlok_today = [];
        }
        if (!student.used_shlok_today.includes(verseKey)) {
            student.used_shlok_today.push(verseKey);
        }
        
        // Update last used verse
        student.last_shlok_used = verseKey;
        
        // Update frequency map
        if (!student.shlok_frequency_map) {
            student.shlok_frequency_map = new Map();
        }
        const currentCount = student.shlok_frequency_map.get(verseKey) || 0;
        student.shlok_frequency_map.set(verseKey, currentCount + 1);
        
        await student.save();
        
        // Update global tracking
        globalVerseUsageCount[verseKey] = (globalVerseUsageCount[verseKey] || 0) + 1;
        
        // Update last 3 global verses
        if (!lastThreeGlobalVerses.includes(verseKey)) {
            lastThreeGlobalVerses.unshift(verseKey);
            if (lastThreeGlobalVerses.length > 3) {
                lastThreeGlobalVerses.pop();
            }
        }
        
        console.log(`✅ Verse tracking updated for ${verseKey}`);
    } catch (err) {
        console.error('❌ Error updating verse tracking:', err.message);
    }
}

/**
 * Fallback verse pool: Use when no verses match
 */
function getFallbackVerse() {
    // Fallback pool: 2.50, 6.5, 3.35, 18.66 (non-2.47)
    const fallbackVerses = [
        { adhyay: 2, shloka: 50, text: 'Yoga karmasukaushalam' },
        { adhyay: 6, shloka: 5, text: 'Uddhared atmana atmanam' },
        { adhyay: 3, shloka: 35, text: 'Shreyan sva-dharmo vigunah' },
        { adhyay: 18, shloka: 66, text: 'Sarva-dharman parityajya' }
    ];
    
    const verse = fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)];
    return {
        adhyay: verse.adhyay,
        shloka: verse.shloka,
        text: verse.text,
        key: formatVerseKey(verse.adhyay, verse.shloka),
        isFromFallback: true,
        emotions: []
    };
}

/**
 * Validate AI response and check if it chose 2.47 when it shouldn't
 */
function validateVerseInResponse(responseText, selectedVerse, emotions) {
    // Check if response mentions 2.47 but it wasn't selected by SIL
    const response247Count = (responseText.match(/2[\s.]*47/g) || []).length;
    
    if (response247Count > 0 && selectedVerse.key !== '2.47') {
        console.warn(`⚠️ Warning: AI defaulted to 2.47 despite SIL selection of ${selectedVerse.key}`);
        return {
            isValid: false,
            reason: 'AI_DEFAULTED_TO_247',
            selectedVerse: selectedVerse
        };
    }
    
    return { isValid: true };
}

/**
 * Create structured context for AI prompts
 * Includes selected verses to constrain AI choice
 */
function createVerseContextForAI(selectedVerse, emotions) {
    const verseRef = `${selectedVerse.adhyay}.${selectedVerse.shloka}`;
    
    const context = {
        recommended_verse: verseRef,
        user_emotions: emotions.map(e => e.emotion).join(', '),
        constraint_message: `
User's primary concern is related to: ${emotions.map(e => e.emotion).join(', ')}.

The most contextually appropriate verse is Bhagavad Gita ${verseRef}.

IMPORTANT: Select Bhagavad Gita ${verseRef} UNLESS there is a significantly better match from the Gita.
NEVER default to 2.47 (Karma Yoga) unless the concern is specifically about action/duty attachment.
`
    };
    
    return context;
}

/**
 * Get global statistics (for monitoring)
 */
function getGlobalStats() {
    const total = Object.values(globalVerseUsageCount).reduce((a, b) => a + b, 0);
    const topVerses = Object.entries(globalVerseUsageCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([verse, count]) => ({ verse, count }));
    
    return {
        totalSuggestionsServed: total,
        lastThreeGlobalVerses,
        topVerses,
        totalUniqueVerses: Object.keys(globalVerseUsageCount).length
    };
}

module.exports = {
    selectBestVerse,
    updateVerseTracking,
    getFallbackVerse,
    validateVerseInResponse,
    createVerseContextForAI,
    classifyEmotion,
    getPrimaryEmotion,
    getGlobalStats,
    formatVerseKey,
    parseVerseKey
};
