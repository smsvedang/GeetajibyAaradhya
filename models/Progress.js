const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    mobile: {
        type: String,
        required: true
    },

    courseId: {
        type: String,   // keep string, that’s fine
        required: true
    },

    completed: {
        type: [String],
        default: []
    },

    // ✅ REQUIRED FOR QUIZ & CERTIFICATE
    quizPassed: {
        type: Boolean,
        default: false
    },

    quizScore: {
        type: Number,
        default: 0
    },

    enrolled: {
        type: Boolean,
        default: true
    },

    enrolledAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });

module.exports = mongoose.model('Progress', progressSchema);
