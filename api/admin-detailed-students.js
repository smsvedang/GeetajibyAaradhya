const { connectDb } = require('./_lib/db');
const Student = require('../models/Student');
const Course = require('../models/Course');
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

        const [students, courses, progressRecords] = await Promise.all([
            Student.find().select('name mobile _id daily_limit used_today last_reset_date ai_usage_count').sort({ createdAt: -1 }).lean(),
            Course.find().select('_id title shlokas').lean(),
            Progress.find().select('mobile courseId completed quizPassed quizScore').lean()
        ]);

        const courseById = new Map(courses.map((c) => [String(c._id), c]));

        const detailedStudents = students.map((student) => {
            const mine = progressRecords.filter((p) => p.mobile === student.mobile);
            const enrolledCourses = [];
            const passedCourses = [];

            for (const progress of mine) {
                const course = courseById.get(String(progress.courseId));
                if (!course) continue;

                const courseData = {
                    courseId: course._id,
                    courseTitle: course.title,
                    completedShlokas: progress.completed?.length || 0,
                    totalShlokas: course.shlokas?.length || 0
                };

                if (progress.quizPassed) {
                    passedCourses.push({
                        ...courseData,
                        quizScore: progress.quizScore || 0
                    });
                } else {
                    enrolledCourses.push(courseData);
                }
            }

            return {
                _id: student._id,
                name: student.name,
                mobile: student.mobile,
                daily_limit: Number(student.daily_limit || 11),
                used_today: Number(student.used_today || 0),
                ai_usage_count: Number(student.ai_usage_count || 0),
                last_reset_date: student.last_reset_date || null,
                enrolledCourses,
                passedCourses
            };
        });

        return res.json(detailedStudents);
    } catch (err) {
        console.error('Detailed students error:', err);
        return res.status(500).json({ message: 'Failed to fetch detailed students' });
    }
};

