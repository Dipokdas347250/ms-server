const jwt = require('jsonwebtoken')
const Admin = require('../models/Admin')
const { sessionCutoff } = require('../config/session')
const { httpError } = require('../utils/response')

// Only refresh sessionSeenAt once a minute, not on every request.
const SEEN_THROTTLE_MS = 60 * 1000

// Requires "Authorization: Bearer <token>" from the admin's current session; sets req.admin.
async function protect(req, _res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ')
  if (scheme !== 'Bearer' || !token) throw httpError(401, 'Please sign in')

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    throw httpError(401, 'Session expired, please sign in again')
  }

  const admin = await Admin.findById(payload.id)
  if (
    !admin ||
    !admin.isActive ||
    admin.tokenVersion !== payload.v ||
    !payload.sid ||
    admin.sessionId !== payload.sid ||
    !admin.sessionSeenAt ||
    admin.sessionSeenAt < sessionCutoff()
  ) {
    throw httpError(401, 'Session expired, please sign in again')
  }

  if (Date.now() - admin.sessionSeenAt.getTime() > SEEN_THROTTLE_MS) {
    admin.sessionSeenAt = new Date()
    await Admin.updateOne({ _id: admin._id, sessionId: payload.sid }, { sessionSeenAt: admin.sessionSeenAt })
  }
  req.admin = admin
  req.sessionId = payload.sid
  next()
}

module.exports = { protect }
