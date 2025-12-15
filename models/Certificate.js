const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    name: String,
    email: String,
    mobile: String,
    courseId: String,
    courseTitle: String,
    language: String,
    certificateId: String
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
