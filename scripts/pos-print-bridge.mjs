/**
 * Local bridge: browser → HTTP → TCP raw (port 9100) thermal printer.
 * Usage: pnpm pos:bridge
 */
import http from 'node:http'
import net from 'node:net'

const PORT = Number(process.env.POS_BRIDGE_PORT || 17777)

function decodeBase64(data: string) {
  return Buffer.from(data, 'base64')
}

function sendRaw(host: string, port: number, payload: Buffer) {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.write(payload, (err) => {
        if (err) {
          reject(err)
          return
        }
        socket.end()
        resolve()
      })
    })
    socket.setTimeout(5000)
    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error('Timeout conectando a la impresora'))
    })
    socket.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'pos-print-bridge', port: PORT }))
    return
  }

  if (req.method !== 'POST' || req.url !== '/print') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'Use POST /print' }))
    return
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      host?: string
      port?: number
      copies?: number
      dataBase64?: string
    }
    if (!body.host || !body.dataBase64) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'host y dataBase64 son obligatorios' }))
      return
    }
    const raw = decodeBase64(body.dataBase64)
    const copies = Math.max(1, Number(body.copies) || 1)
    const printerPort = Number(body.port) || 9100
    for (let i = 0; i < copies; i++) {
      await sendRaw(body.host, printerPort, raw)
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, host: body.host, port: printerPort, copies }))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Error de impresión',
      }),
    )
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[pos-bridge] listo en http://127.0.0.1:${PORT}/print`)
  console.log('[pos-bridge] health: GET /health')
  console.log('[pos-bridge] Envía host + port (9100) + dataBase64 ESC/POS')
})
