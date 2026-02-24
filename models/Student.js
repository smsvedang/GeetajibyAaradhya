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
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
