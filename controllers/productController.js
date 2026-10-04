const fs = require('node:fs/promises')
const path = require('node:path')
const Order = require('../models/Order')
const Product = require('../models/Product')
const { trackStock } = require('../config/shop')
const { PRODUCT_DIR } = require('../middleware/uploadMiddleware')
const { ok, httpError } = require('../utils/response')

const IMAGE_PREFIX = '/uploads/products/'
const MAX_IMAGES = 12

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// What customers see: no stock numbers, just whether each size can be ordered.
const toPublic = (p) => ({
  _id: p._id,
  slug: p.slug,
  name: p.name,
  color: p.color,
  price: p.price,
  description: p.description,
  images: p.images,
  imagePosition: p.imagePosition,
  variants: p.variants.map((v) => ({ size: v.size, inStock: !trackStock() || v.stock > 0 })),
})

async function findProduct(id) {
  const product = await Product.findById(id)
  if (!product) throw httpError(404, 'Product not found')
  return product
}

// Deletes an uploaded file; ignores URLs that aren't ours (e.g. external images).
async function deleteImageFile(url) {
  if (!url?.startsWith(IMAGE_PREFIX)) return
  await fs.unlink(path.join(PRODUCT_DIR, path.basename(url))).catch(() => {})
}

// GET /api/products (public)
async function listPublic(_req, res) {
  const products = await Product.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 })
  ok(res, products.map(toPublic))
}

// GET /api/products/:slug (public)
async function getPublic(req, res) {
  const product = await Product.findOne({ slug: req.params.slug.toLowerCase(), isActive: true })
  if (!product) throw httpError(404, 'Product not found')
  ok(res, toPublic(product))
}

// GET /api/products/admin/all?q=&active=
async function listAll(req, res) {
  const { q, active } = req.validQuery
  const filter = {}
  if (active) filter.isActive = active === 'true'
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: rx }, { slug: rx }, { color: rx }]
  }
  ok(res, await Product.find(filter).sort({ sortOrder: 1, createdAt: 1 }))
}

// GET /api/products/admin/:id
async function getOne(req, res) {
  ok(res, await findProduct(req.params.id))
}

// POST /api/products
async function create(req, res) {
  if (await Product.exists({ slug: req.body.slug })) throw httpError(409, `Slug "${req.body.slug}" is already used`)
  const product = await Product.create(req.body)
  ok(res, product, `${product.name} created`, 201)
}

// PUT /api/products/:id (any subset of fields)
async function update(req, res) {
  const product = await findProduct(req.params.id)
  if (req.body.slug && req.body.slug !== product.slug && (await Product.exists({ slug: req.body.slug }))) {
    throw httpError(409, `Slug "${req.body.slug}" is already used`)
  }
  product.set(req.body)
  await product.save()
  ok(res, product, `${product.name} saved`)
}

// PATCH /api/products/:id/stock — absolute stock per size
async function updateStock(req, res) {
  const product = await findProduct(req.params.id)
  for (const { size, stock } of req.body.variants) {
    const v = product.variants.find((x) => x.size === size)
    if (v) v.stock = stock
    else product.variants.push({ size, stock })
  }
  await product.save()
  ok(res, product, `Stock updated · ${product.totalStock} in total`)
}

// DELETE /api/products/:id — hidden instead if any order references it.
async function remove(req, res) {
  const product = await findProduct(req.params.id)
  if (await Order.exists({ 'items.product': product._id })) {
    product.isActive = false
    await product.save()
    return ok(res, product, `${product.name} is in past orders, so it was hidden instead`)
  }
  await product.deleteOne()
  await Promise.all(product.images.map(deleteImageFile))
  ok(res, null, `${product.name} deleted`)
}

// POST /api/products/:id/images (multipart, field "images")
async function uploadImages(req, res) {
  const files = req.files || []
  if (!files.length) throw httpError(400, 'Choose at least one image')
  const product = await Product.findById(req.params.id)
  if (!product || product.images.length + files.length > MAX_IMAGES) {
    await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})))
    if (!product) throw httpError(404, 'Product not found')
    throw httpError(400, `A product can have at most ${MAX_IMAGES} images`)
  }
  product.images.push(...files.map((f) => IMAGE_PREFIX + f.filename))
  await product.save()
  ok(res, product, `${files.length} image${files.length === 1 ? '' : 's'} uploaded`)
}

// DELETE /api/products/:id/images { url }
async function removeImage(req, res) {
  const product = await findProduct(req.params.id)
  if (!product.images.includes(req.body.url)) throw httpError(404, 'Image not found on this product')
  product.images = product.images.filter((u) => u !== req.body.url)
  await product.save()
  await deleteImageFile(req.body.url)
  ok(res, product, 'Image removed')
}

module.exports = { listPublic, getPublic, listAll, getOne, create, update, updateStock, remove, uploadImages, removeImage }
