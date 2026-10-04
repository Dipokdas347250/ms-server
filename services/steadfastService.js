// Steadfast Courier API — https://portal.packzy.com (formerly portal.steadfast.com.bd)
const { httpError } = require('../utils/response')
const { getIntegrationKeys } = require('./settingsService')

const baseUrl = () => (process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1').replace(/\/$/, '')

// Pulls a readable message out of Steadfast's error bodies ({ message } or { errors: { field: [msg] } }).
function errorMessage(json, status) {
  if (json?.errors && typeof json.errors === 'object') {
    const first = Object.values(json.errors).flat()[0]
    if (first) return String(first)
  }
  return json?.message || `request failed (${status})`
}

async function call(method, path, body) {
  const { steadfast } = await getIntegrationKeys()
  if (!steadfast.apiKey || !steadfast.secretKey) {
    throw httpError(400, 'Steadfast is not connected. Add the API key and secret key in Settings.')
  }

  let res
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        'Api-Key': steadfast.apiKey,
        'Secret-Key': steadfast.secretKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    })
  } catch {
    throw httpError(502, 'Could not reach Steadfast. Try again in a minute.')
  }

  const json = await res.json().catch(() => null)
  if (res.status === 401 || res.status === 403) throw httpError(400, 'Steadfast rejected the API key or secret key. Check them in Settings.')
  if (!res.ok || !json || (json.status && Number(json.status) !== 200)) {
    throw httpError(502, `Steadfast: ${errorMessage(json, res.status)}`)
  }
  return json
}

// Creates a cash-on-delivery parcel. Returns { consignmentId, trackingCode, status }.
async function createParcel(order) {
  const json = await call('POST', '/create_order', {
    invoice: order.orderId,
    recipient_name: order.shipping.name.slice(0, 100),
    recipient_phone: order.shipping.phone,
    recipient_address: order.shipping.address.slice(0, 250),
    cod_amount: order.paymentStatus === 'paid' ? 0 : order.total,
    note: order.items.map((i) => `${i.name} ${i.color || ''} ${i.size}x${i.quantity}`.replace(/\s+/g, ' ')).join(', ').slice(0, 250),
  })
  const c = json.consignment || {}
  if (!c.consignment_id) throw httpError(502, 'Steadfast did not return a consignment ID')
  return { consignmentId: String(c.consignment_id), trackingCode: c.tracking_code || '', status: c.status || 'in_review' }
}

// Current delivery status, e.g. in_review, pending, hold, delivered, partial_delivered, cancelled.
async function getStatus(consignmentId) {
  const json = await call('GET', `/status_by_cid/${encodeURIComponent(consignmentId)}`)
  return json.delivery_status || 'unknown'
}

async function getBalance() {
  const json = await call('GET', '/get_balance')
  return Number(json.current_balance) || 0
}

module.exports = { createParcel, getStatus, getBalance }
