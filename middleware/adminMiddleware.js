const { httpError } = require('../utils/response')

// Use after protect(). Only superadmins manage admins and integration keys.
function superadminOnly(req, _res, next) {
  if (req.admin?.role !== 'superadmin') throw httpError(403, 'Only a superadmin can do this')
  next()
}

module.exports = { superadminOnly }
