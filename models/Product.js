const mongoose = require('mongoose')
const { SIZES } = require('../config/shop')

const variantSchema = new mongoose.Schema(
  {
    size: { type: String, enum: SIZES, required: true },
    stock: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    images: { type: [String], default: [] },
    imagePosition: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    variants: { type: [variantSchema], default: () => SIZES.map((size) => ({ size, stock: 0 })) },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false } },
)

productSchema.virtual('totalStock').get(function () {
  return (this.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0)
})

module.exports = mongoose.model('Product', productSchema)
