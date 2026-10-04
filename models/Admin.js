const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const { ROLES } = require('../config/shop')

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    passwordChangedAt: Date,
    // Bumped on password change so tokens issued before it stop working.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
)

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
  if (!this.isNew) {
    this.passwordChangedAt = new Date()
    this.tokenVersion += 1
  }
})

adminSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

adminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password
    delete ret.tokenVersion
    delete ret.__v
    return ret
  },
})

module.exports = mongoose.model('Admin', adminSchema)
