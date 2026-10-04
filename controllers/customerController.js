const Customer = require('../models/Customer')
const Order = require('../models/Order')
const { ok, httpError } = require('../utils/response')

const SORTS = {
  recent: { lastOrderAt: -1 },
  orders: { orderCount: -1, lastOrderAt: -1 },
  spent: { totalSpent: -1, lastOrderAt: -1 },
  newest: { createdAt: -1 },
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// GET /api/customers?q=&sort=&blocked=&page=&limit=
async function listCustomers(req, res) {
  const { q, sort, blocked, page, limit } = req.validQuery
  const filter = {}
  if (blocked) filter.isBlocked = blocked === 'true'
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: rx }, { phone: rx }, { address: rx }]
  }

  const [items, total] = await Promise.all([
    Customer.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Customer.countDocuments(filter),
  ])
  ok(res, { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}

// GET /api/customers/:id — profile plus order history
async function getCustomer(req, res) {
  const customer = await Customer.findById(req.params.id).lean()
  if (!customer) throw httpError(404, 'Customer not found')
  const orders = await Order.find({ customer: customer._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .select('orderId items status paymentStatus total createdAt')
    .lean()
  ok(res, { ...customer, orders })
}

// PATCH /api/customers/:id — name, phone, address, area, notes, isBlocked
async function updateCustomer(req, res) {
  const customer = await Customer.findById(req.params.id)
  if (!customer) throw httpError(404, 'Customer not found')
  if (req.body.phone && req.body.phone !== customer.phone && (await Customer.exists({ phone: req.body.phone }))) {
    throw httpError(409, 'Another customer already has this phone number')
  }
  customer.set(req.body)
  await customer.save()

  const message =
    req.body.isBlocked === true ? `${customer.name} is blocked` : req.body.isBlocked === false ? `${customer.name} is unblocked` : 'Customer saved'
  ok(res, customer, message)
}

module.exports = { listCustomers, getCustomer, updateCustomer }
