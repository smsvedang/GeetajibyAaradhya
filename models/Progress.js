const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    mobile: {
        type: String,
        required: true
    },
    courseId: {
        type: String,   // 🔥 STRING ONLY
        required: true
    },
    completed: {
        type: [String],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('Progress', progressSchema);
