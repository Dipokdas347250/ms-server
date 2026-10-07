// npm run reset-admin — sets the password of ADMIN_EMAIL back to ADMIN_PASSWORD (both from .env),
// makes the account the shop's one admin (every other account is disabled) and signs out its session.
// Also the way out if the admin is locked out by a session left open on another device.
// Or: npm run reset-admin -- someone@example.com NewPassword123
require('dotenv').config({ quiet: true, path: require('node:path').join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const connectDB = require('../config/db')
const Admin = require('../models/Admin')

const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = process.argv[3] || process.env.ADMIN_PASSWORD

async function reset() {
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env')
  if (password.length < 8) throw new Error('Password must be at least 8 characters')

  let admin = await Admin.findOne({ email })
  if (!admin) {
    admin = new Admin({ name: process.env.ADMIN_NAME || 'Owner', email, password, role: 'superadmin' })
    console.log(`✓ Admin ${email} did not exist, created it`)
  } else {
    admin.password = password
    admin.role = 'superadmin'
    admin.isActive = true
    admin.sessionId = null
    admin.sessionSeenAt = null
    console.log(`✓ Password reset for ${email}`)
  }
  await admin.save()

  // Only one admin: everyone else loses sign-in.
  const others = await Admin.updateMany(
    { _id: { $ne: admin._id }, $or: [{ role: 'superadmin' }, { isActive: true }] },
    { role: 'admin', isActive: false, sessionId: null, $inc: { tokenVersion: 1 } },
  )
  if (others.modifiedCount) console.log(`✓ Disabled ${others.modifiedCount} other admin account(s)`)
  console.log(`  Sign in at the dashboard with: ${email} / ${password}`)
}

connectDB()
  .then(reset)
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
