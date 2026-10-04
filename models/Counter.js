const mongoose = require('mongoose')

// Atomic sequence per key (one per day for order IDs).
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false })

module.exports = mongoose.model('Counter', counterSchema)
