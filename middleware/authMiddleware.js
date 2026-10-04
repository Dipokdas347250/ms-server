const jwt = require('jsonwebtoken')
const Admin = require('../models/Admin')
const { httpError } = require('../utils/response')

// Requires "Authorization: Bearer <token>" from an active admin; sets req.admin.
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
  if (!admin || !admin.isActive || admin.tokenVersion !== payload.v) {
    throw httpError(401, 'Session expired, please sign in again')
  }
  req.admin = admin
  next()
}

module.exports = { protect }
