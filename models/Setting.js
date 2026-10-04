const mongoose = require('mongoose')

// One document with the integration keys admins manage from the dashboard Settings page.
const settingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'shop' },
    steadfast: {
      apiKey: { type: String, default: '' },
      secretKey: { type: String, default: '' },
    },
    meta: {
      pixelId: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      testEventCode: { type: String, default: '' },
    },
  },
  { timestamps: true, versionKey: false },
)

settingSchema.statics.load = async function () {
  return this.findOneAndUpdate({ _id: 'shop' }, { $setOnInsert: { _id: 'shop' } }, { upsert: true, returnDocument: 'after' })
}

module.exports = mongoose.model('Setting', settingSchema)
