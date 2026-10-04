const Customer = require('../models/Customer')
const Order = require('../models/Order')
const Product = require('../models/Product')
const { LOW_STOCK, VOID_STATUSES, trackStock } = require('../config/shop')
const { bdDateKey, bdDayStart } = require('../utils/date')
const { ok } = require('../utils/response')

// GET /api/admin/dashboard
async function summary(_req, res) {
  const todayStart = bdDayStart(bdDateKey())
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000)
  const live = { status: { $nin: VOID_STATUSES } }

  const [byStatus, week, customers, lowStock] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$total' } } }]),
    Order.aggregate([
      { $match: { ...live, createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+06:00' } },
          orders: { $sum: 1 },
          amount: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Customer.countDocuments(),
    trackStock()
      ? Product.find({ isActive: true, variants: { $elemMatch: { stock: { $lte: LOW_STOCK } } } }).sort({ sortOrder: 1 }).limit(10)
      : [],
  ])

  const statusCounts = Object.fromEntries(byStatus.map((s) => [s._id, { count: s.count, amount: s.amount }]))
  const last7Days = week.map((d) => ({ date: d._id, orders: d.orders, amount: d.amount }))
  const today = last7Days.find((d) => d.date === bdDateKey()) || { orders: 0, amount: 0 }

  ok(res, {
    today: { orders: today.orders, amount: today.amount },
    deliveredRevenue: { orders: statusCounts.delivered?.count || 0, amount: statusCounts.delivered?.amount || 0 },
    statusCounts,
    last7Days,
    customers,
    trackStock: trackStock(),
    lowStock,
  })
}

module.exports = { summary }
