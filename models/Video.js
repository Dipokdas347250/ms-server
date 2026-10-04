const mongoose = require('mongoose')

// A YouTube video shown on the storefront. The first visible one (lowest sortOrder) plays at the top.
const videoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: '' },
    url: { type: String, required: true, trim: true },
    youtubeId: { type: String, required: true },
    // Shorts are vertical (9:16); the storefront sizes the player to match.
    isShort: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
)

module.exports = mongoose.model('Video', videoSchema)
