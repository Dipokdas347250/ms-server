const Admin = require('../models/Admin')
const { ok, httpError } = require('../utils/response')

// GET /api/admin/admins
async function listAdmins(_req, res) {
  ok(res, await Admin.find().sort({ createdAt: 1 }))
}

// POST /api/admin/admins
async function createAdmin(req, res) {
  if (await Admin.exists({ email: req.body.email })) throw httpError(409, 'An admin with this email already exists')
  const admin = await Admin.create(req.body)
  ok(res, admin, `${admin.name} can now sign in`, 201)
}

// PATCH /api/admin/admins/:id — name, role, password, isActive
async function updateAdmin(req, res) {
  const admin = await Admin.findById(req.params.id)
  if (!admin) throw httpError(404, 'Admin not found')

  const isSelf = admin._id.equals(req.admin._id)
  if (isSelf && req.body.isActive === false) throw httpError(400, "You can't disable your own account")
  if (isSelf && req.body.role && req.body.role !== admin.role) throw httpError(400, "You can't change your own role")

  // Keep at least one active superadmin.
  const losesSuperadmin = admin.role === 'superadmin' && (req.body.role === 'admin' || req.body.isActive === false)
  if (losesSuperadmin && (await Admin.countDocuments({ role: 'superadmin', isActive: true })) <= 1) {
    throw httpError(400, 'There must be at least one active superadmin')
  }

  for (const key of ['name', 'role', 'password', 'isActive']) {
    if (req.body[key] !== undefined) admin[key] = req.body[key]
  }
  // Disabling also ends the admin's sessions.
  if (req.body.isActive === false) admin.tokenVersion += 1
  await admin.save()
  ok(res, admin, `${admin.name} updated`)
}

module.exports = { listAdmins, createAdmin, updateAdmin }
