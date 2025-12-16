const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
    name: String,
    email: String,
    mobile: String,
    courseTitle: String,
    language: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Certificate', CertificateSchema);
