// A session with no requests for this long is over, so the admin can sign in again
// after closing the browser without logging out. The dashboard pings while it is open.
const SESSION_IDLE_MS = (Number(process.env.SESSION_IDLE_MINUTES) || 15) * 60 * 1000

const sessionCutoff = () => new Date(Date.now() - SESSION_IDLE_MS)

module.exports = { SESSION_IDLE_MS, sessionCutoff }
