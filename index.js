require('dotenv').config({ quiet: true })

const path = require('node:path')
const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const mongoose = require('mongoose')
const connectDB = require('./config/db')
const { errorHandler, notFound } = require('./middleware/errorMiddleware')

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET in server/.env must be at least 32 characters')
  process.exit(1)
}

const app = express()

// Number of proxies in front of the API (the Next.js storefront counts as one) so req.ip is the customer's.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))

const allowedOrigins = (process.env.CLIENT_URLS || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)) }))
app.use(express.json({ limit: '100kb' }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }))

app.get('/api/health', (_req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  res.status(db === 'connected' ? 200 : 503).json({ success: db === 'connected', data: { status: 'ok', db, time: new Date() } })
})

app.use('/api/admin/admins', require('./routes/adminRoutes'))
app.use('/api/admin/dashboard', require('./routes/dashboardRoutes'))
app.use('/api/admin', require('./routes/authRoutes'))
app.use('/api/orders', require('./routes/orderRoutes'))
app.use('/api/products', require('./routes/productRoutes'))
app.use('/api/customers', require('./routes/customerRoutes'))
app.use('/api/settings', require('./routes/settingsRoutes'))
app.use('/api/videos', require('./routes/videoRoutes'))

app.use(notFound)
app.use(errorHandler)

const PORT = Number(process.env.PORT) || 5000

connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message)
    process.exit(1)
  })
