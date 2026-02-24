/**
 * 🧠 EMOTION CLASSIFIER
 * Classifies user input into emotional categories
 * Maps emotions to appropriate Gita verses
 */

const EMOTION_KEYWORDS = {
    fear: {
        keywords: ['dar', 'bhay', 'darr', 'scared', 'frightened', 'nervous', 'tension', 'anxious', 'anxiety', 'bahar nikalna difficult', 'kadam badhana mushkil'],
        weight: 1.0
    },
    jealousy: {
        keywords: ['jalan', 'comparison', 'compare', 'compare kar raha', 'compare kar rahe', 'aage nikal gaye', 'kyun unse kam hoon', 'woh better', 'woh zyada', 'jealous', 'envious', 'aankh lag gayi'],
        weight: 1.0
    },
    restlessness: {
        keywords: ['mann chanchal', 'mind restless', 'unstable', 'fikr', 'tension', 'worried', 'confuse', 'confused', 'unclear', 'direction nahi', 'kya karoon', 'shaanti nahi'],
        weight: 1.0
    },
    depression: {
        keywords: ['thakaan', 'tired', 'exhausted', 'nirasha', 'despair', 'hopeless', 'hope nahi', 'kahin se help nahi', 'akela', 'alone', 'dukh', 'sad', 'sadness', 'discourage', 'discouraged', 'nahi raha'],
        weight: 1.0
    },
    duty_conflict: {
        keywords: ['kya karte hain', 'duty', 'responsibility', 'conflict', 'confused', 'kya sahi hai', 'right thing', 'moral', 'ethics', 'difficult choice', 'family vs work', 'dilemma'],
        weight: 1.0
    },
    anger: {
        keywords: ['gussa', 'angry', 'anger', 'furious', 'enrage', 'frustrated', 'frustration', 'upset', 'irritate', 'annoyed', 'krodh'],
        weight: 1.0
    },
    ego: {
        keywords: ['ahankaar', 'ego', 'pride', 'garv', 'self-respect', 'insult', 'insulted', 'disrespect', 'disrespected', 'ignore', 'feel bad', 'hurt pride'],
        weight: 1.0
    },
    attachment: {
        keywords: ['moh', 'attached', 'attachment', 'love', 'person ko bhool nahi pata', 'rishtedari', 'emotional', 'let go', 'chhod nahi sakta', 'separation'],
        weight: 1.0
    },
    weakness: {
        keywords: ['kamai', 'kamzor', 'weak', 'weakness', 'capability', 'incapable', 'strength', 'strong', 'shakti'],
        weight: 0.8
    },
    self_doubt: {
        keywords: ['doubt', 'shakk', 'capable nahi', 'haan sakta', 'haan sakta nahi', 'confidence', 'self-belief', 'believe'],
        weight: 0.8
    }
};

function normalize(s = '') {
    return String(s).trim().toLowerCase();
}

/**
 * Classify user message into emotion categories
 * Returns array of emotions with scores
 */
function classifyEmotion(userMessage = '') {
    if (!userMessage) return [];
    
    const normalizedMsg = normalize(userMessage);
    const emotionScores = {};
    
    // Score each emotion based on keyword matches
    for (const [emotion, data] of Object.entries(EMOTION_KEYWORDS)) {
        let score = 0;
        for (const keyword of data.keywords) {
            const keywordNorm = normalize(keyword);
            if (normalizedMsg.includes(keywordNorm)) {
                score += data.weight;
            }
        }
        if (score > 0) {
            emotionScores[emotion] = score;
        }
    }
    
    // Return emotions sorted by score (highest first)
    return Object.entries(emotionScores)
        .sort(([, a], [, b]) => b - a)
        .map(([emotion, score]) => ({
            emotion,
            score,
            confidence: Math.min(score / 2, 1) // Normalize to 0-1
        }));
}

/**
 * Get primary emotion (highest scoring)
 */
function getPrimaryEmotion(userMessage = '') {
    const emotions = classifyEmotion(userMessage);
    return emotions.length > 0 ? emotions[0].emotion : 'general';
}

/**
 * Get all emotions above a confidence threshold
 */
function getEmotionsAboveThreshold(userMessage = '', threshold = 0.3) {
    return classifyEmotion(userMessage)
        .filter(e => e.confidence >= threshold)
        .map(e => e.emotion);
}

module.exports = {
    classifyEmotion,
    getPrimaryEmotion,
    getEmotionsAboveThreshold,
    EMOTION_KEYWORDS
};
