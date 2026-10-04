const Customer = require('../models/Customer')
const Product = require('../models/Product')
const { AREAS, COMBO_PRICE, COMBO_SIZE } = require('../config/shop')
const { httpError } = require('../utils/response')

// Every COMBO_SIZE units cost COMBO_PRICE; the most expensive units go into combos first.
// The dashboard's NewOrderModal mirrors this for its estimate.
function calculateTotals(items, area) {
  const prices = items.flatMap((i) => Array(i.quantity).fill(i.unitPrice)).sort((a, b) => b - a)
  const combos = Math.floor(prices.length / COMBO_SIZE)
  const subtotal = prices.reduce((s, p) => s + p, 0)
  const leftover = prices.slice(combos * COMBO_SIZE).reduce((s, p) => s + p, 0)
  const discount = Math.max(0, subtotal - (combos * COMBO_PRICE + leftover))
  const deliveryFee = prices.length ? AREAS[area].fee : 0
  return { isCombo: combos > 0, subtotal, discount, deliveryFee, total: subtotal - discount + deliveryFee }
}

// Takes units out of stock, all or nothing. Throws 409 when a size doesn't have enough left.
async function reserveStock(items) {
  const done = []
  for (const item of items) {
    const res = await Product.updateOne(
      { _id: item.product, variants: { $elemMatch: { size: item.size, stock: { $gte: item.quantity } } } },
      { $inc: { 'variants.$.stock': -item.quantity } },
    )
    if (res.modifiedCount !== 1) {
      await releaseStock(done)
      throw httpError(409, `দুঃখিত, ${item.name} (${item.color}) — ${item.size} সাইজ স্টকে নেই।`)
    }
    done.push(item)
  }
}

async function releaseStock(items) {
  for (const item of items) {
    await Product.updateOne({ _id: item.product, 'variants.size': item.size }, { $inc: { 'variants.$.stock': item.quantity } })
  }
}

// Adds (or with a negative amount, removes) money from the customer's lifetime total.
async function adjustCustomerSpent(customerId, amount) {
  if (customerId && amount) await Customer.updateOne({ _id: customerId }, { $inc: { totalSpent: amount } })
}

module.exports = { calculateTotals, reserveStock, releaseStock, adjustCustomerSpent }
