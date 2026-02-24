const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, index: true, unique: true, sparse: true },
    description: { type: String },
    adhyay: { type: Number, required: true },
    imageUrl: { type: String },
    shlokas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shloka' }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
