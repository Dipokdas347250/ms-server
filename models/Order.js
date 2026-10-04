const mongoose = require('mongoose')
const { AREAS, ORDER_STATUSES, PAYMENT_STATUSES, SIZES } = require('../config/shop')

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    slug: String,
    name: String,
    color: String,
    size: { type: String, enum: SIZES },
    quantity: { type: Number, min: 1 },
    unitPrice: Number,
  },
  { _id: false },
)

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES },
    note: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    items: { type: [itemSchema], required: true },
    isCombo: { type: Boolean, default: false },
    subtotal: Number,
    discount: { type: Number, default: 0 },
    deliveryFee: Number,
    total: Number,
    shipping: {
      name: { type: String, required: true },
      phone: { type: String, required: true, index: true },
      address: { type: String, required: true },
      area: { type: String, enum: Object.keys(AREAS), required: true },
    },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    statusHistory: [historySchema],
    customerNote: String,
    adminNote: String,
    courier: {
      provider: String,
      consignmentId: String,
      trackingCode: String,
      status: String,
      sentAt: Date,
      syncedAt: Date,
    },
    // True while this order's units are taken out of product stock.
    stockReserved: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
)

orderSchema.index({ createdAt: -1 })

module.exports = mongoose.model('Order', orderSchema)
