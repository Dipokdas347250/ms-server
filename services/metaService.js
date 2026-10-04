// Meta Conversions API: sends the Purchase event from the server as well as the browser pixel.
// Both use the order ID as event_id, so Meta counts each order once.
const crypto = require('node:crypto')
const { getIntegrationKeys } = require('./settingsService')

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v24.0'
const sha256 = (v) => crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex')

async function sendPurchase(order, { ip, tracking = {} } = {}) {
  const { meta } = await getIntegrationKeys()
  if (!meta.pixelId || !meta.accessToken) return

  const [firstName, ...rest] = order.shipping.name.trim().split(/\s+/)
  const event = {
    event_name: 'Purchase',
    event_time: Math.floor(order.createdAt.getTime() / 1000),
    event_id: order.orderId,
    action_source: 'website',
    event_source_url: tracking.sourceUrl,
    user_data: {
      ph: [sha256(`88${order.shipping.phone}`)],
      fn: [sha256(firstName)],
      ln: rest.length ? [sha256(rest.join(' '))] : undefined,
      country: [sha256('bd')],
      external_id: [sha256(order.shipping.phone)],
      client_ip_address: ip,
      client_user_agent: tracking.userAgent,
      fbp: tracking.fbp,
      fbc: tracking.fbc,
    },
    custom_data: {
      currency: 'BDT',
      value: order.total,
      order_id: order.orderId,
      content_type: 'product',
      content_ids: [...new Set(order.items.map((i) => i.slug))],
      num_items: order.items.reduce((s, i) => s + i.quantity, 0),
    },
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${meta.pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [event],
        access_token: meta.accessToken,
        ...(meta.testEventCode ? { test_event_code: meta.testEventCode } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) console.warn(`Meta CAPI ${order.orderId}:`, (await res.json().catch(() => ({})))?.error?.message || res.status)
  } catch (err) {
    console.warn(`Meta CAPI ${order.orderId}:`, err.message)
  }
}

module.exports = { sendPurchase }
