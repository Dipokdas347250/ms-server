// Shop rules. The dashboard (src/utils/constants.js) and storefront (src/lib/products.js) mirror these.
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded']
const SIZES = ['M', 'L', 'XL', 'XXL']
const ROLES = ['admin', 'superadmin']

const COMBO_SIZE = 3
const COMBO_PRICE = 990
const MAX_ITEMS_PER_ORDER = 12
const LOW_STOCK = 5

const AREAS = {
  inside: { label: 'Inside Dhaka', fee: 70 },
  outside: { label: 'Outside Dhaka', fee: 130 },
}

// Which statuses an order may move to next.
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
}

// Statuses that are not a sale: stock goes back and the amount leaves the customer's total.
const VOID_STATUSES = ['cancelled', 'returned']

const trackStock = () => process.env.TRACK_STOCK === 'true'

module.exports = {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SIZES,
  ROLES,
  COMBO_SIZE,
  COMBO_PRICE,
  MAX_ITEMS_PER_ORDER,
  LOW_STOCK,
  AREAS,
  TRANSITIONS,
  VOID_STATUSES,
  trackStock,
}
