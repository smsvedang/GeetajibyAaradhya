const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
    name: String,
    email: String,
    mobile: String,
    courseTitle: String,
    certificateId: String,
    language: String,
    percentage: Number, // Added percentage field
    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

CertificateSchema.index(
    { mobile: 1, courseTitle: 1 },
    { unique: true }
);

module.exports = mongoose.model('Certificate', CertificateSchema);
