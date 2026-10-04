const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const multer = require('multer')
const { httpError } = require('../utils/response')

const PRODUCT_DIR = path.join(__dirname, '..', 'uploads', 'products')
fs.mkdirSync(PRODUCT_DIR, { recursive: true })

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

const productImages = multer({
  storage: multer.diskStorage({
    destination: PRODUCT_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 3 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(httpError(400, 'Only JPG, PNG or WEBP images'))),
}).array('images', 6)

module.exports = { productImages, PRODUCT_DIR }
