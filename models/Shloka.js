const mongoose = require('mongoose');

const shlokaSchema = new mongoose.Schema({
    adhyay: { type: Number, required: true },
    shloka: { type: Number, required: true },
    slug: { type: String, index: true, unique: true, sparse: true },
    text: { type: String },
    video_id: { type: String, required: true },
    likes: { type: Number, default: 0 },
    
    // 🔥 SIL - Emotional Tagging System
    tags: { 
        type: [String], 
        default: [],
        // Supported tags: fear, jealousy, restlessness, depression, 
        // duty-conflict, anger, ego, attachment, weakness, self-doubt,
        // karma, duty, result-attachment, mind-control, detachment, etc.
    },
    priority: { 
        type: Number, 
        default: 5,
        min: 1, 
        max: 10 
        // 1-3: Low, 4-6: Medium, 7-10: High
    },
    category: {
        type: String,
        enum: ['fear', 'jealousy', 'restlessness', 'depression', 'duty-conflict', 'anger', 'ego', 'attachment', 'general'],
        default: 'general'
    },
    diversity_score: { 
        type: Number, 
        default: 0,
        // Increases with each use, helps avoid overusing similar verses
    },
    global_usage_count: { 
        type: Number, 
        default: 0,
        // Track how many times this verse has been suggested globally
    },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Shloka || mongoose.model('Shloka', shlokaSchema);
