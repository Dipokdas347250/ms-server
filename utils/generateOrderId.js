const Counter = require('../models/Counter')
const { bdDateKey } = require('./date')

// MS-YYMMDD-NNNN, counting from 0001 every Bangladesh day.
module.exports = async function generateOrderId() {
  const day = bdDateKey().slice(2).replaceAll('-', '')
  const { seq } = await Counter.findOneAndUpdate(
    { _id: `order-${day}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  )
  return `MS-${day}-${String(seq).padStart(4, '0')}`
}
