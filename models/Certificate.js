const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    name: String,
    email: String,
    mobile: String,
    courseTitle: String,
    language: String,
    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
});
