export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image
                }
              },
              {
                type: 'text',
                text: `Extract all grocery items from this shopping list image. For each item:
1. Identify the item name
2. Extract quantity if mentioned (default to 1 if not specified)
3. Normalize the item name to a common brand/product (e.g., "milk" → "Amul Taaza Toned Milk 1L")
4. Suggest an alternative brand option

Return ONLY a JSON array with this exact structure, no other text:
[
  {
    "item": "normalized item name with brand",
    "quantity": "quantity with unit",
    "searchTerm": "search term for BigBasket",
    "alternative": "alternative brand name"
  }
]`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({ error: errorData.error?.message || 'API error' });
    }

    const data = await response.json();
    if (!data.content || data.content.length === 0) {
      return res.status(400).json({ error: 'No response from AI' });
    }

    let textContent = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const items = JSON.parse(textContent);
    
    return res.status(200).json({ items });
  } catch (error) {
    console.error('Processing error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process image' });
  }
}
