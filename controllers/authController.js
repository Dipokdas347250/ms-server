const bcrypt = require('bcryptjs')
const Admin = require('../models/Admin')
const generateToken = require('../utils/generateToken')
const { ok, httpError } = require('../utils/response')

// Compared against when the email doesn't exist, so both cases take the same time.
const DUMMY_HASH = bcrypt.hashSync('no-such-admin', 12)

// POST /api/admin/login
async function login(req, res) {
  const { email, password } = req.body
  const admin = await Admin.findOne({ email }).select('+password')
  const valid = admin ? await admin.checkPassword(password) : await bcrypt.compare(password, DUMMY_HASH)
  if (!admin || !valid) throw httpError(401, 'Wrong email or password')
  if (!admin.isActive) {
    throw httpError(
      403,
      admin.lastLoginAt
        ? 'This account is disabled. Ask a superadmin to enable it.'
        : 'Your account is waiting for approval. A superadmin must approve it before you can sign in.',
    )
  }

  admin.lastLoginAt = new Date()
  await admin.save()
  ok(res, { token: generateToken(admin), admin }, `Welcome back, ${admin.name}`)
}

// POST /api/admin/register (public) — creates a disabled admin that a superadmin must approve.
async function register(req, res) {
  const { name, email, password } = req.body
  if (await Admin.exists({ email })) throw httpError(409, 'An account with this email already exists')
  await Admin.create({ name, email, password, role: 'admin', isActive: false })
  ok(res, null, 'Account created. A superadmin must approve it before you can sign in.', 201)
}

// GET /api/admin/me
async function me(req, res) {
  ok(res, req.admin)
}

// PUT /api/admin/password — also signs out every other session.
async function changePassword(req, res) {
  const admin = await Admin.findById(req.admin._id).select('+password')
  if (!(await admin.checkPassword(req.body.currentPassword))) throw httpError(400, 'Current password is wrong')
  if (req.body.currentPassword === req.body.newPassword) throw httpError(400, 'Choose a different password')

  admin.password = req.body.newPassword
  await admin.save()
  ok(res, { token: generateToken(admin) }, 'Password updated')
}

module.exports = { login, register, me, changePassword }
