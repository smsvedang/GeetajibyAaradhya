const mongoose = require('mongoose');

const shlokaSchema = new mongoose.Schema({
    adhyay: { type: Number, required: true },
    shloka: { type: Number, required: true },
    slug: { type: String, index: true, unique: true, sparse: true },
    text: { type: String },
    video_id: { type: String, required: true },
    likes: { type: Number, default: 0 }
});

module.exports = mongoose.models.Shloka || mongoose.model('Shloka', shlokaSchema);
