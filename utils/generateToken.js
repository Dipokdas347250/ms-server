const jwt = require('jsonwebtoken')

// `v` is the admin's tokenVersion — changing the password bumps it and old tokens are refused.
// `sid` is the admin's current session — signing out ends it and the token is refused.
module.exports = (admin) =>
  jwt.sign({ id: admin._id.toString(), v: admin.tokenVersion || 0, sid: admin.sessionId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
