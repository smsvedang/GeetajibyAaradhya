const { connectDb } = require('./_lib/db');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Shloka = require('../models/Shloka');
const Progress = require('../models/Progress');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    if (req.query.password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        await connectDb();
        const [students, courses, shlokas, progresses] = await Promise.all([
            Student.find().select('name mobile ai_usage_count used_today daily_limit last_reset_date').lean(),
            Course.find().select('title slug shlokas').lean(),
            Shloka.find().select('adhyay shloka').lean(),
            Progress.find().lean()
        ]);

        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());

        const totalStudents = students.length;
        const activeToday = students.filter((s) => s.last_reset_date === today && Number(s.used_today || 0) > 0).length;
        const aiUsageToday = students.reduce((sum, s) => sum + Number(s.used_today || 0), 0);
        const totalCourses = courses.length;

        const courseById = {};
        courses.forEach((c) => { courseById[String(c._id)] = c; });

        const studentUsage = students.map((s) => {
            const mine = progresses.filter((p) => p.mobile === s.mobile);
            const totalViewed = mine.reduce((sum, p) => sum + (p.completed?.length || 0), 0);
            const progressPercents = mine.map((p) => {
                const total = (courseById[p.courseId]?.shlokas?.length || 0) || 0;
                const done = p.completed?.length || 0;
                return total > 0 ? Math.round((done / total) * 100) : 0;
            });
            const avgProgress = progressPercents.length
                ? Math.round(progressPercents.reduce((a, b) => a + b, 0) / progressPercents.length)
                : 0;
            return {
                name: s.name,
                ai_used_today: Number(s.used_today || 0),
                daily_limit: Number(s.daily_limit || 3),
                shlok_views: totalViewed,
                course_completion_percent: avgProgress
            };
        });

        const shlokMap = {};
        progresses.forEach((p) => {
            (p.completed || []).forEach((id) => {
                const key = String(id);
                shlokMap[key] = (shlokMap[key] || 0) + 1;
            });
        });
        const shlokAnalytics = shlokas.map((s) => ({
            adhyay: s.adhyay,
            shlok: s.shloka,
            views: shlokMap[String(s._id)] || 0,
            listens: shlokMap[String(s._id)] || 0
        })).sort((a, b) => b.views - a.views);

        const courseAnalytics = courses.map((c) => {
            const mine = progresses.filter((p) => p.courseId === String(c._id) && p.enrolled);
            const enrolledCount = mine.length;
            const completedCount = mine.filter((p) => p.quizPassed).length;
            const avgProgress = mine.length
                ? Math.round(mine.reduce((acc, p) => {
                    const total = c.shlokas?.length || 0;
                    const done = p.completed?.length || 0;
                    return acc + (total > 0 ? (done / total) * 100 : 0);
                }, 0) / mine.length)
                : 0;
            return {
                course_name: c.title,
                enrolled_count: enrolledCount,
                completed_count: completedCount,
                avg_progress_percent: avgProgress
            };
        });

        return res.json({
            overview: { total_students: totalStudents, active_today: activeToday, ai_usage_today: aiUsageToday, total_courses: totalCourses },
            student_usage: studentUsage,
            shlok_analytics: shlokAnalytics,
            course_analytics: courseAnalytics
        });
    } catch {
        return res.status(500).json({ message: 'Analytics unavailable' });
    }
};
