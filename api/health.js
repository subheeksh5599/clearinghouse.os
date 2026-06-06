export default async function handler(req, res) {
  const target = "https://clearinghouse-os.onrender.com"
  const url = new URL(req.url, `http://${req.headers.host}`)
  const targetUrl = `${target}${url.pathname}${url.search}`
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: { "Content-Type": "application/json" },
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
  })
  const data = await response.json()
  res.status(response.status).json(data)
}
