// Pulls the 11-character video ID out of any common YouTube link
// (watch?v=, youtu.be/, /shorts/, /embed/, /live/) or a bare ID. Returns null otherwise.
function parseYouTube(input) {
  const url = String(input ?? '').trim()
  const match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{11})/)
  const id = match?.[1] ?? (/^[\w-]{11}$/.test(url) ? url : null)
  if (!id) return null
  return { youtubeId: id, isShort: /\/shorts\//.test(url) }
}

module.exports = { parseYouTube }
