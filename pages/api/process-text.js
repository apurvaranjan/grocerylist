// API endpoint to process grocery items from text input
// This runs on the server and calls Claude API securely

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  // Validate input
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  try {
    // Get Claude API key from environment variables (secure)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Call Claude API to extract and normalize grocery items
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Extract all grocery items from this text. The text may contain items in Hindi (Devanagari script), English, or a mix of both languages. For each item:
1. Identify the item name (recognize both Hindi and English text)
2. Extract quantity if mentioned (default to 1 if not specified)
3. Normalize the item name to a common brand/product (e.g., "milk" or "दूध" → "Amul Taaza Toned Milk")
4. Suggest an alternative brand option

Text: ${text}

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
      })
    });

    // Handle API errors
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({ error: errorData.error?.message || 'API error' });
    }

    // Parse Claude's response
    const data = await response.json();
    if (!data.content || data.content.length === 0) {
      return res.status(400).json({ error: 'No response from AI' });
    }

    // Extract JSON from response (Claude sometimes wraps it in markdown)
    let textContent = data.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Convert JSON string to array
    const items = JSON.parse(textContent);
    
    // Return extracted items to frontend
    return res.status(200).json({ items });
  } catch (error) {
    console.error('Processing error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process text' });
  }
}
