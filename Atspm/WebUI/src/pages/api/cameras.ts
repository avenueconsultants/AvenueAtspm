import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const url = `https://www.udottraffic.utah.gov/api/v2/get/cameras?key=62d8f5f6b6294edc82e296592c51303c`
    const upstream = await fetch(url)

    const text = await upstream.text() // read once
    res.status(upstream.status)

    // If it’s JSON, return JSON; otherwise return text
    try {
      res.setHeader('Content-Type', 'application/json')
      return res.send(JSON.parse(text))
    } catch {
      return res.send(text)
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Proxy failed' })
  }
}
