const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

(async () => {
try {
    const password = 'Admin@123';
    const hash = await bcrypt.hash(password, 10);

    await db.query('DELETE FROM users WHERE email = ?', ['admin@cityclinic.co.za']);
    await db.query(
    'INSERT INTO users (email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
    ['admin@cityclinic.co.za', hash, 'ADMIN', 'System', 'Admin']
    );

    console.log(' Admin created: admin@cityclinic.co.za / Admin@123');
    process.exit(0);
} catch (err) {
    console.error(' Error:', err.message);
    process.exit(1);
}
})();