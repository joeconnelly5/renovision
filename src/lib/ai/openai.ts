import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateRoomRendering(prompt: string): Promise<Buffer> {
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1792x1024',
    n: 1,
  })

  const imageData = response.data?.[0]

  if (!imageData) {
    throw new Error('No image data returned from OpenAI')
  }

  if (imageData.b64_json) {
    return Buffer.from(imageData.b64_json, 'base64')
  }

  if (imageData.url) {
    const imageResponse = await fetch(imageData.url)
    const arrayBuffer = await imageResponse.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  throw new Error('No image data returned from OpenAI')
}
