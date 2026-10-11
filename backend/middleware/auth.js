const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticate(req, res, next) {
const header = req.headers.authorization;
if (!header) return res.status(401).json({ error: 'No token provided' });
const token = header.split(' ')[1];
try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
} catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
}
}

function authorize(...roles) {
return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
    }
    next();
};
}

module.exports = { authenticate, authorize };
