// npm run seed — creates the first superadmin (ADMIN_* in .env) and the storefront's products.
// Safe to run again: existing admins and products are left untouched.
require('dotenv').config({ quiet: true, path: require('node:path').join(__dirname, '..', '.env') })

const fs = require('node:fs')
const path = require('node:path')
const mongoose = require('mongoose')
const connectDB = require('../config/db')
const Admin = require('../models/Admin')
const Product = require('../models/Product')
const Video = require('../models/Video')
const { SIZES } = require('../config/shop')
const { parseYouTube } = require('../utils/youtube')

const STORE_ASSETS = path.join(__dirname, '..', '..', 'my-app', 'src', 'assets')
const UPLOADS = path.join(__dirname, '..', 'uploads', 'products')

// Mirrors my-app/src/lib/products.js — the slug is the storefront's product id.
const PRODUCTS = [
  { slug: 'love-navy', name: '#LOVE প্রিন্ট', color: 'নেভি ব্লু', image: 'love-navy.jpg' },
  { slug: 'royal-blue', name: 'ক্লাসিক প্লেইন', color: 'রয়েল ব্লু', image: 'royal-blue.jpg' },
  { slug: 'sky-tree', name: 'গাছ ও পাখি প্রিন্ট', color: 'স্কাই ব্লু', image: 'sky-tree.jpg' },
  { slug: 'maroon', name: 'প্রিমিয়াম সলিড', color: 'মেরুন', image: 'solid-pack.jpg', imagePosition: '8% 50%' },
  { slug: 'sage', name: 'প্রিমিয়াম সলিড', color: 'সেজ গ্রিন', image: 'solid-pack.jpg', imagePosition: '50% 50%' },
  { slug: 'navy', name: 'প্রিমিয়াম সলিড', color: 'নেভি', image: 'solid-pack.jpg', imagePosition: '92% 50%' },
]

function copyImage(file) {
  const src = path.join(STORE_ASSETS, file)
  if (!fs.existsSync(src)) return []
  fs.mkdirSync(UPLOADS, { recursive: true })
  fs.copyFileSync(src, path.join(UPLOADS, file))
  return [`/uploads/products/${file}`]
}

async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return console.log('• ADMIN_EMAIL / ADMIN_PASSWORD not set, skipped admin')
  if (await Admin.exists({ email: ADMIN_EMAIL.toLowerCase() })) {
    return console.log(`• Admin ${ADMIN_EMAIL} already exists (password unchanged — use "npm run reset-admin" to apply ADMIN_PASSWORD)`)
  }
  await Admin.create({ name: ADMIN_NAME || 'Owner', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'superadmin' })
  console.log(`✓ Superadmin ${ADMIN_EMAIL} created`)
}

async function seedProducts() {
  for (const [i, p] of PRODUCTS.entries()) {
    if (await Product.exists({ slug: p.slug })) {
      console.log(`• Product ${p.slug} already exists`)
      continue
    }
    await Product.create({
      slug: p.slug,
      name: p.name,
      color: p.color,
      price: 450,
      images: copyImage(p.image),
      imagePosition: p.imagePosition || '',
      sortOrder: i,
      variants: SIZES.map((size) => ({ size, stock: 50 })),
    })
    console.log(`✓ Product ${p.slug} created`)
  }
}

// The video that was hard-coded in my-app/src/lib/products.js (YOUTUBE_URL).
async function seedVideos() {
  if (await Video.exists({})) return console.log('• Videos already exist')
  const url = 'https://youtube.com/shorts/9kgAlgIJcxE'
  await Video.create({ title: 'এমএস ফ্যাশন — টি-শার্ট কালেকশন', url, ...parseYouTube(url) })
  console.log('✓ Shop video added')
}

connectDB()
  .then(seedAdmin)
  .then(seedProducts)
  .then(seedVideos)
  .then(() => console.log('Done.'))
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
