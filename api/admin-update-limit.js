const { connectDb, parseBody } = require('./_lib/db');
const Student = require('../models/Student');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    try {
        await connectDb();
        const body = parseBody(req);
        const { adminPassword, userId, new_limit } = body;
        if (adminPassword !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const limit = Number(new_limit);
        if (!Number.isInteger(limit) || limit <= 0) {
            return res.status(400).json({ message: 'new_limit must be a positive integer' });
        }
        const student = await Student.findByIdAndUpdate(
            userId,
            { daily_limit: limit },
            { new: true }
        );
        if (!student) {
            return res.status(404).json({ message: 'User not found' });
        }
        return res.json({
            success: true,
            userId: student._id,
            daily_limit: student.daily_limit,
            used_today: student.used_today
        });
    } catch {
        return res.status(500).json({ message: 'Limit update failed' });
    }
};
