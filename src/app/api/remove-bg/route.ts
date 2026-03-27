import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image_file') as File

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    const apiKey = process.env.REMOVE_BG_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const removeBgFormData = new FormData()
    removeBgFormData.append('image_file', imageFile)
    removeBgFormData.append('size', 'auto')

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: removeBgFormData,
    })

    if (!response.ok) {
      let errorMsg = `remove.bg error (${response.status})`
      try {
        const errJson = await response.json()
        if (errJson?.errors?.[0]?.title) errorMsg = errJson.errors[0].title
      } catch {
        // non-JSON body — use text
        try { errorMsg = await response.text() } catch { /* ignore */ }
      }
      console.error('Remove.bg error:', errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    const imageBuffer = await response.arrayBuffer()
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('Remove bg API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
