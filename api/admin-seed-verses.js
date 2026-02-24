const { parseBody } = require('./_lib/db');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Authenticate using secret stored in Vercel env: VERCEL_ADMIN_SECRET
        const provided = req.headers['x-admin-secret'] || (req.body && req.body.secret) || req.query.secret;
        const secret = process.env.VERCEL_ADMIN_SECRET || process.env.ADMIN_SEED_SECRET;
        if (!secret) {
            return res.status(500).json({ message: 'Server not configured: admin secret missing' });
        }
        if (!provided || provided !== secret) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { seedVerses } = require('./_lib/seed-verses');
        const result = await seedVerses();
        return res.json({ status: 'ok', result });
    } catch (err) {
        console.error('Admin seed error:', err);
        return res.status(500).json({ message: 'Seeding failed', error: err.message });
    }
};
