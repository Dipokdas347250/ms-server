const crypto = require('node:crypto')
const bcrypt = require('bcryptjs')
const Admin = require('../models/Admin')
const { SESSION_IDLE_MS, sessionCutoff } = require('../config/session')
const generateToken = require('../utils/generateToken')
const { ok, httpError } = require('../utils/response')

// Compared against when the email doesn't exist, so both cases take the same time.
const DUMMY_HASH = bcrypt.hashSync('no-such-admin', 12)

// The shop has one admin: whoever registers first. After that, registration is closed.
const registrationOpen = async () => !(await Admin.exists({}))

// GET /api/admin/register — { open } so the dashboard knows whether to offer sign-up.
async function registerStatus(_req, res) {
  ok(res, { open: await registrationOpen() })
}

// POST /api/admin/register (public) — only works while there is no admin yet.
async function register(req, res) {
  if (!(await registrationOpen())) throw httpError(403, 'This shop already has its admin. Registration is closed.')
  const { name, email, password } = req.body
  const admin = await Admin.create({ name, email, password, role: 'superadmin', isActive: true })

  // Two sign-ups at the same moment: the earlier one wins, the later one is undone.
  const first = await Admin.findOne().sort({ createdAt: 1, _id: 1 })
  if (!first._id.equals(admin._id)) {
    await Admin.deleteOne({ _id: admin._id })
    throw httpError(403, 'This shop already has its admin. Registration is closed.')
  }
  ok(res, null, 'Account created. You can sign in now.', 201)
}

// POST /api/admin/login — only the shop's one admin can sign in,
// and only while nobody is already signed in.
async function login(req, res) {
  const { email, password } = req.body
  const admin = await Admin.findOne({ email, isActive: true }).select('+password')
  const valid = admin ? await admin.checkPassword(password) : await bcrypt.compare(password, DUMMY_HASH)
  if (!admin || !valid) throw httpError(401, 'Wrong email or password')

  // Claim the session only if there is none or it went idle — atomic, so two sign-ins can't both win.
  const now = new Date()
  const claimed = await Admin.findOneAndUpdate(
    { _id: admin._id, $or: [{ sessionId: null }, { sessionSeenAt: { $lt: sessionCutoff() } }] },
    { sessionId: crypto.randomUUID(), sessionSeenAt: now, lastLoginAt: now },
    { new: true },
  )
  if (!claimed) {
    throw httpError(
      409,
      `The admin is already signed in on another device. Log out there first, or wait ${SESSION_IDLE_MS / 60000} minutes after it was last used.`,
    )
  }
  ok(res, { token: generateToken(claimed), admin: claimed }, `Welcome back, ${claimed.name}`)
}

// POST /api/admin/logout — ends the session so the admin can sign in elsewhere.
async function logout(req, res) {
  await Admin.updateOne({ _id: req.admin._id, sessionId: req.sessionId }, { sessionId: null, sessionSeenAt: null })
  ok(res, null, 'Signed out')
}

// GET /api/admin/me
async function me(req, res) {
  ok(res, req.admin)
}

// PATCH /api/admin/profile — the admin edits their own name, email and role.
// Role only decides who may change integration keys; it never locks the admin out.
async function updateProfile(req, res) {
  const { currentPassword, ...changes } = req.body
  const admin = await Admin.findById(req.admin._id).select('+password')
  if (!(await admin.checkPassword(currentPassword))) throw httpError(400, 'Current password is wrong')

  if (changes.email && changes.email !== admin.email && (await Admin.exists({ email: changes.email, _id: { $ne: admin._id } }))) {
    throw httpError(409, 'Another account already uses this email')
  }
  for (const key of ['name', 'email', 'role']) {
    if (changes[key] !== undefined) admin[key] = changes[key]
  }
  await admin.save()
  ok(res, admin, 'Profile updated')
}

// PUT /api/admin/password
async function changePassword(req, res) {
  const admin = await Admin.findById(req.admin._id).select('+password')
  if (!(await admin.checkPassword(req.body.currentPassword))) throw httpError(400, 'Current password is wrong')
  if (req.body.currentPassword === req.body.newPassword) throw httpError(400, 'Choose a different password')

  admin.password = req.body.newPassword
  await admin.save()
  ok(res, { token: generateToken(admin) }, 'Password updated')
}

module.exports = { registerStatus, register, login, logout, me, updateProfile, changePassword }
