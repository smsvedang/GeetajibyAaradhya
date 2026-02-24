const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    daily_limit: { type: Number, default: 3 },
    used_today: { type: Number, default: 0 },
    last_reset_date: { type: String },
    ai_usage_count: { type: Number, default: 0 },
    
    // Window-based guidance system (PRD v6.1)
    current_window_id: { type: String, default: null },
    window_start_time: { type: Date, default: null },
    window_token_used: { type: Number, default: 0 },
    window_active: { type: Boolean, default: false },
    
    // 🔥 SIL - Verse Repetition Tracking
    last_shlok_used: { 
        type: String, 
        default: null 
        // Format: "2.47" (adhyay.shlok)
    },
    used_shlok_today: { 
        type: [String], 
        default: []
        // Array of verses used in current day
    },
    used_shlok_this_window: {
        type: [String],
        default: []
        // Array of verses used in current 20-minute window
    },
    last_three_shloks_global: {
        type: [String],
        default: []
        // Last 3 globally suggested verses (across all users)
    },
    shlok_frequency_map: {
        type: Map,
        of: Number,
        default: new Map()
        // Track how many times each verse suggested to this user
        // Format: {"2.47": 3, "6.5": 1}
    },
    emotion_usage_history: {
        type: [Object],
        default: []
        // Track emotional patterns for better recommendations
        // {date, emotion, suggested_shlok, user_feedback}
    },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
