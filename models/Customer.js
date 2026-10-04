const mongoose = require('mongoose')
const { AREAS } = require('../config/shop')

// One profile per phone number, created automatically with the first order.
const customerSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    area: { type: String, enum: Object.keys(AREAS) },
    notes: { type: String, default: '' },
    isBlocked: { type: Boolean, default: false },
    orderCount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrderAt: Date,
  },
  { timestamps: true, versionKey: false },
)

module.exports = mongoose.model('Customer', customerSchema)
