const Customer = require('../models/Customer')
const Order = require('../models/Order')
const Product = require('../models/Product')
const { MAX_ITEMS_PER_ORDER, TRANSITIONS, VOID_STATUSES, trackStock } = require('../config/shop')
const { adjustCustomerSpent, calculateTotals, releaseStock, reserveStock } = require('../services/orderService')
const metaService = require('../services/metaService')
const steadfast = require('../services/steadfastService')
const { bdDayStart } = require('../utils/date')
const generateOrderId = require('../utils/generateOrderId')
const { ok, httpError } = require('../utils/response')

const EDITABLE = ['pending', 'confirmed', 'processing']
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const itemsKey = (items) =>
  items
    .map((i) => `${i.slug}|${i.size}|${i.quantity}`)
    .sort()
    .join(',')

async function findOrder(orderId) {
  const order = await Order.findOne({ orderId: String(orderId).toUpperCase() })
  if (!order) throw httpError(404, 'Order not found')
  return order
}

// Moves an order to a new status (only along TRANSITIONS) and applies the side effects.
// The status is part of the update filter, so two admins can't apply the same change twice.
async function applyStatus(order, status, { note, adminId } = {}) {
  if (!TRANSITIONS[order.status].includes(status)) {
    throw httpError(400, `A ${order.status} order can't be marked ${status}`)
  }
  const voiding = VOID_STATUSES.includes(status)
  const set = { status }
  if (status === 'delivered') set.paymentStatus = 'paid'
  if (status === 'returned' && order.paymentStatus === 'paid') set.paymentStatus = 'refunded'
  if (voiding) set.stockReserved = false

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { $set: set, $push: { statusHistory: { status, note: note || undefined, changedBy: adminId, at: new Date() } } },
    { returnDocument: 'after' },
  )
  if (!updated) throw httpError(409, 'Someone else just changed this order. Reload and try again.')

  if (voiding) {
    if (order.stockReserved) await releaseStock(order.items)
    await adjustCustomerSpent(order.customer, -order.total)
  }
  return updated
}

// POST /api/orders (public) — the storefront and the dashboard's "New order" both use this.
async function placeOrder(req, res) {
  const { name, phone, address, area, items: lines, note, tracking } = req.body

  // Same product + size twice → one line.
  const merged = new Map()
  for (const l of lines) {
    const key = `${l.productId}|${l.size}`
    merged.set(key, { ...l, quantity: (merged.get(key)?.quantity || 0) + l.quantity })
  }
  const units = [...merged.values()].reduce((s, l) => s + l.quantity, 0)
  if (units > MAX_ITEMS_PER_ORDER) throw httpError(400, `এক অর্ডারে সর্বোচ্চ ${MAX_ITEMS_PER_ORDER}টি পণ্য নেওয়া যায়।`)

  const products = await Product.find({ slug: { $in: [...merged.values()].map((l) => l.productId) }, isActive: true })
  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const items = [...merged.values()].map((l) => {
    const p = bySlug.get(l.productId)
    if (!p) throw httpError(400, 'একটি পণ্য এখন আর পাওয়া যাচ্ছে না। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।')
    return { product: p._id, slug: p.slug, name: p.name, color: p.color, size: l.size, quantity: l.quantity, unitPrice: p.price }
  })

  const existing = await Customer.findOne({ phone })
  if (existing?.isBlocked) throw httpError(403, 'এই নম্বর থেকে অর্ডার নেওয়া যাচ্ছে না। অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।')

  // A double-tap or a resubmit within 10 minutes returns the first order instead of a copy.
  const recent = await Order.find({
    'shipping.phone': phone,
    status: 'pending',
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  })
  const duplicate = recent.find((o) => itemsKey(o.items) === itemsKey(items))
  if (duplicate) {
    return ok(res, { orderId: duplicate.orderId, total: duplicate.total, duplicate: true }, 'This order was already placed')
  }

  const reserve = trackStock()
  if (reserve) await reserveStock(items)

  let order
  try {
    const customer =
      existing ||
      (await Customer.findOneAndUpdate(
        { phone },
        { $setOnInsert: { phone, name, address, area } },
        { upsert: true, returnDocument: 'after' },
      ))
    order = await Order.create({
      orderId: await generateOrderId(),
      customer: customer._id,
      items,
      ...calculateTotals(items, area),
      shipping: { name, phone, address, area },
      customerNote: note || undefined,
      statusHistory: [{ status: 'pending' }],
      stockReserved: reserve,
    })
    await Customer.updateOne(
      { _id: customer._id },
      { $set: { name, address, area, lastOrderAt: order.createdAt }, $inc: { orderCount: 1, totalSpent: order.total } },
    )
  } catch (err) {
    if (reserve && !order) await releaseStock(items)
    throw err
  }

  // Only storefront orders carry browser tracking data; phone orders from the dashboard aren't ad conversions.
  if (tracking) metaService.sendPurchase(order, { ip: req.ip, tracking })

  ok(res, { orderId: order.orderId, total: order.total, duplicate: false }, `Order ${order.orderId} placed`, 201)
}

// GET /api/orders?status=a,b&q=&area=&from=&to=&page=&limit=
async function listOrders(req, res) {
  const { status, q, area, from, to, page, limit } = req.validQuery
  const filter = {}
  if (status.length) filter.status = { $in: status }
  if (area) filter['shipping.area'] = area
  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = bdDayStart(from)
    if (to) filter.createdAt.$lt = new Date(bdDayStart(to).getTime() + 86400000)
  }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    let digits = q.replace(/\D/g, '')
    if (digits.startsWith('880')) digits = digits.slice(2)
    filter.$or = [
      { orderId: rx },
      { 'shipping.name': rx },
      { 'shipping.phone': digits.length >= 3 ? new RegExp(digits) : rx },
      { 'courier.trackingCode': rx },
      { 'courier.consignmentId': rx },
    ]
  }

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ])
  ok(res, { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
}

// GET /api/orders/:id (the MS-… order ID)
async function getOrder(req, res) {
  const order = await Order.findOne({ orderId: req.params.id.toUpperCase() })
    .populate('customer', 'name phone orderCount totalSpent isBlocked notes')
    .populate('statusHistory.changedBy', 'name')
    .lean()
  if (!order) throw httpError(404, 'Order not found')
  ok(res, { ...order, allowedStatuses: TRANSITIONS[order.status] })
}

// PATCH /api/orders/:id/status
async function updateStatus(req, res) {
  const order = await findOrder(req.params.id)
  const updated = await applyStatus(order, req.body.status, { note: req.body.note, adminId: req.admin._id })
  ok(res, updated, `Order marked ${updated.status}`)
}

// PATCH /api/orders/:id — shipping, paymentStatus, adminNote
async function updateOrder(req, res) {
  const order = await findOrder(req.params.id)
  const { shipping, paymentStatus, adminNote } = req.body
  let totalChange = 0

  if (shipping) {
    if (!EDITABLE.includes(order.status)) throw httpError(400, 'Shipping can only be changed before the order ships')
    const totals = calculateTotals(order.items, shipping.area)
    totalChange = totals.total - order.total
    order.shipping = shipping
    order.deliveryFee = totals.deliveryFee
    order.total = totals.total
  }
  if (paymentStatus) order.paymentStatus = paymentStatus
  if (adminNote !== undefined) order.adminNote = adminNote

  await order.save()
  await adjustCustomerSpent(order.customer, totalChange)
  ok(res, order, shipping ? 'Shipping updated' : paymentStatus ? `Payment marked ${paymentStatus}` : 'Note saved')
}

// POST /api/orders/:id/courier — creates the Steadfast parcel and marks the order shipped.
async function sendToCourier(req, res) {
  const order = await findOrder(req.params.id)
  if (order.courier?.consignmentId) throw httpError(409, `Already sent to Steadfast (consignment ${order.courier.consignmentId})`)
  if (!['confirmed', 'processing'].includes(order.status)) {
    throw httpError(400, 'Confirm the order first. Only confirmed or processing orders can be sent.')
  }

  const parcel = await steadfast.createParcel(order)
  order.courier = { provider: 'steadfast', ...parcel, sentAt: new Date(), syncedAt: new Date() }
  await order.save()
  const updated = await applyStatus(order, 'shipped', {
    note: `Steadfast consignment ${parcel.consignmentId}`,
    adminId: req.admin._id,
  })
  ok(res, updated, `Sent to Steadfast · tracking ${parcel.trackingCode || parcel.consignmentId}`)
}

// POST /api/orders/:id/courier/sync — pulls the latest Steadfast status.
async function syncCourier(req, res) {
  let order = await findOrder(req.params.id)
  if (!order.courier?.consignmentId) throw httpError(400, 'This order has not been sent to a courier')

  const status = await steadfast.getStatus(order.courier.consignmentId)
  order.courier.status = status
  order.courier.syncedAt = new Date()
  await order.save()

  if (status === 'delivered' && TRANSITIONS[order.status].includes('delivered')) {
    order = await applyStatus(order, 'delivered', { note: 'Delivered (Steadfast)' })
  } else if (status === 'cancelled' && TRANSITIONS[order.status].includes('returned')) {
    order = await applyStatus(order, 'returned', { note: 'Cancelled by Steadfast, parcel returned' })
  }
  ok(res, order, `Steadfast status: ${status.replaceAll('_', ' ')}`)
}

// GET /api/orders/track/:orderId?phone= (public) — the phone must match the order.
async function trackOrder(req, res) {
  const order = await Order.findOne({ orderId: req.params.orderId.toUpperCase(), 'shipping.phone': req.validQuery.phone }).lean()
  if (!order) throw httpError(404, 'No order found with this ID and phone number')
  ok(res, {
    orderId: order.orderId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    items: order.items.map(({ name, color, size, quantity }) => ({ name, color, size, quantity })),
    total: order.total,
    trackingCode: order.courier?.trackingCode || null,
    history: order.statusHistory.map(({ status, at }) => ({ status, at })),
    createdAt: order.createdAt,
  })
}

module.exports = { placeOrder, listOrders, getOrder, updateStatus, updateOrder, sendToCourier, syncCourier, trackOrder }
