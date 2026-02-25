const { connectDb, getTodayInIST, parseBody } = require('./_lib/db');
const Student = require('../models/Student');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    try {
        await connectDb();
        const body = parseBody(req);
        const { password, userId } = body || {};
        const cronSecret = req.headers['x-cron-secret'];
        const isAuthorized =
            password === process.env.ADMIN_PASSWORD ||
            (process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET);

        if (!isAuthorized) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const today = getTodayInIST();
        const resetPatch = {
            used_today: 0,
            last_reset_date: today,
            current_window_id: null,
            window_start_time: null,
            window_token_used: 0,
            window_active: false,
            used_shlok_this_window: []
        };

        if (userId) {
            const student = await Student.findByIdAndUpdate(userId, resetPatch, { new: true });
            if (!student) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.json({
                success: true,
                reset: 1,
                today,
                student: {
                    userId: student._id,
                    name: student.name,
                    mobile: student.mobile,
                    daily_limit: student.daily_limit,
                    used_today: Number(student.used_today || 0)
                }
            });
        }

        const result = await Student.updateMany({}, resetPatch);
        return res.json({ success: true, reset: result.modifiedCount || 0, today });
    } catch {
        return res.status(500).json({ message: 'Reset failed' });
    }
};

