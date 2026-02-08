import React, { useState } from 'react';
import { Camera, ShoppingCart, ExternalLink, Loader2, AlertCircle, Plus, Mic, MicOff, RotateCcw, Trash2, Edit2, Check, X } from 'lucide-react';

export default function GroceryScanner() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [pendingImageData, setPendingImageData] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [tesseractLoading, setTesseractLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedItemName, setEditedItemName] = useState('');
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-IN'; // English-India for better mixed language support
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTextInput(prev => prev ? `${prev}, ${transcript}` : transcript);
        setError('');
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'no-speech') {
          setError('No speech detected. Please try speaking again.');
        } else if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError('Microphone access denied. Please check your browser permissions and refresh the page.');
        } else if (event.error === 'network') {
          setError('Network error. Please check your internet connection.');
        } else {
          setError(`Voice input error: ${event.error}. Please try again.`);
        }
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleVoiceInput = async () => {
    if (!recognition) {
      setError('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        // Request microphone access first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setError('');
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error('Microphone access error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone access denied. Please allow microphone access in your browser settings and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.');
        } else {
          setError('Unable to access microphone. Please check your settings and try again.');
        }
      }
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      setImage(event.target.result);
      setPendingImageData(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleTesseractUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setTesseractLoading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      setImage(event.target.result);
      await processTesseractImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const processTesseractImage = async (imageData) => {
    try {
      // Load Tesseract from CDN
      const Tesseract = window.Tesseract || await loadTesseract();
      
      const { data: { text } } = await Tesseract.recognize(
        imageData,
        'eng+hin', // English + Hindi
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`Processing: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      // Parse the extracted text
      const parsedItems = parseGroceryText(text);
      
      if (parsedItems.length === 0) {
        setError('No items found in the image. Please try a clearer photo.');
      } else {
        setItems(prevItems => [...prevItems, ...parsedItems]);
      }
    } catch (err) {
      console.error('Tesseract error:', err);
      setError('Failed to process image with Tesseract. Please try again.');
    } finally {
      setTesseractLoading(false);
    }
  };

  const loadTesseract = async () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
      script.onload = () => resolve(window.Tesseract);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const parseGroceryText = (text) => {
    const items = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    // Simple brand mapping
    const brandMap = {
      'milk': 'Amul Taaza Toned Milk',
      'दूध': 'Amul Taaza Toned Milk',
      'bread': 'Modern Bread',
      'ब्रेड': 'Modern Bread',
      'rice': 'India Gate Basmati Rice',
      'चावल': 'India Gate Basmati Rice',
      'tomato': 'Fresh Tomatoes',
      'टमाटर': 'Fresh Tomatoes',
      'onion': 'Fresh Onions',
      'प्याज': 'Fresh Onions',
      'potato': 'Fresh Potatoes',
      'आलू': 'Fresh Potatoes',
      'oil': 'Fortune Sunflower Oil',
      'तेल': 'Fortune Sunflower Oil',
      'sugar': 'Madhur Pure Sugar',
      'चीनी': 'Madhur Pure Sugar',
      'salt': 'Tata Salt',
      'नमक': 'Tata Salt',
      'atta': 'Aashirvaad Atta',
      'आटा': 'Aashirvaad Atta',
      'dal': 'Tata Sampann Toor Dal',
      'दाल': 'Tata Sampann Toor Dal',
      'tea': 'Tata Tea Gold',
      'चाय': 'Tata Tea Gold',
      'butter': 'Amul Butter',
      'मक्खन': 'Amul Butter',
      'cheese': 'Amul Cheese',
      'paneer': 'Amul Fresh Paneer',
      'पनीर': 'Amul Fresh Paneer',
      'egg': 'Fresh Eggs',
      'अंडा': 'Fresh Eggs'
    };

    lines.forEach(line => {
      // Extract quantity patterns like "2 kg", "500g", "1L", etc.
      const quantityMatch = line.match(/(\d+\.?\d*)\s*(kg|g|l|ml|liter|litre|किलो|ग्राम|लीटर)?/i);
      const quantity = quantityMatch ? `${quantityMatch[1]} ${quantityMatch[2] || 'unit'}` : '1 unit';
      
      // Clean the line to get item name
      let itemName = line.replace(/[\d\.\,]+\s*(kg|g|l|ml|liter|litre|किलो|ग्राम|लीटर)?/gi, '').trim();
      itemName = itemName.toLowerCase();
      
      if (itemName.length < 2) return; // Skip very short items
      
      // Find matching brand
      let normalizedItem = itemName;
      let searchTerm = itemName;
      
      for (const [key, value] of Object.entries(brandMap)) {
        if (itemName.includes(key)) {
          normalizedItem = value;
          searchTerm = value.toLowerCase();
          break;
        }
      }
      
      items.push({
        item: normalizedItem.charAt(0).toUpperCase() + normalizedItem.slice(1),
        quantity: quantity,
        searchTerm: searchTerm,
        alternative: null
      });
    });

    return items;
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setImage(imageDataUrl);
    setPendingImageData(imageDataUrl);
    stopCamera();
  };

  const processImage = async (base64Image) => {
    try {
      const base64Data = base64Image.split(',')[1];
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Data
                  }
                },
                {
                  type: 'text',
                  text: `Extract all grocery items from this shopping list image. The list may contain items in Hindi (Devanagari script), English, or a mix of both languages. For each item:
1. Identify the item name (recognize both Hindi and English text)
2. Extract quantity if mentioned (default to 1 if not specified)
3. Normalize the item name to a common brand/product (e.g., "milk" or "दूध" → "Amul Taaza Toned Milk")
4. Suggest an alternative brand option

Return ONLY a JSON array with this exact structure, no other text:
[
  {
    "item": "normalized item name with brand",
    "quantity": "quantity with unit",
    "searchTerm": "search term for BigBasket",
    "alternative": "alternative brand name"
  }
]

Example output:
[
  {"item": "Amul Taaza Toned Milk", "quantity": "1 L", "searchTerm": "amul toned milk", "alternative": "Mother Dairy Toned Milk"},
  {"item": "Organic Tomatoes", "quantity": "500 g", "searchTerm": "organic tomatoes", "alternative": "Regular Tomatoes"}
]`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMIT: Too many requests. Please wait a minute and try again.');
        } else if (response.status === 529) {
          throw new Error('SERVICE_UNAVAILABLE: Service temporarily unavailable. Please try again in a moment.');
        } else {
          throw new Error(`API_ERROR: Server returned status ${response.status}`);
        }
      }

      const data = await response.json();
      
      if (!data.content || data.content.length === 0) {
        throw new Error('No response from AI');
      }

      let textContent = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

      textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parsedItems = JSON.parse(textContent);
      
      if (!Array.isArray(parsedItems)) {
        throw new Error('Invalid response format');
      }

      return parsedItems;
    } catch (err) {
      console.error('Processing error:', err);
      throw err;
    }
  };

  const processTextInput = async (text) => {
    if (!text.trim()) return [];

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
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

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('RATE_LIMIT: Too many requests. Please wait a minute and try again.');
        } else if (response.status === 529) {
          throw new Error('SERVICE_UNAVAILABLE: Service temporarily unavailable. Please try again in a moment.');
        } else {
          throw new Error(`API_ERROR: Server returned status ${response.status}`);
        }
      }

      const data = await response.json();
      
      if (!data.content || data.content.length === 0) {
        throw new Error('No response from AI');
      }

      let textContent = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

      textContent = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parsedItems = JSON.parse(textContent);
      
      if (!Array.isArray(parsedItems)) {
        throw new Error('Invalid response format');
      }

      return parsedItems;
    } catch (err) {
      console.error('Processing error:', err);
      throw err;
    }
  };

  const handleLetsShop = async () => {
    setLoading(true);
    setError('');
    // Don't clear existing items - append to them

    try {
      let allItems = [];

      // Process image if available
      if (pendingImageData) {
        const imageItems = await processImage(pendingImageData);
        allItems = [...allItems, ...imageItems];
      }

      // Process text input if available
      if (textInput.trim()) {
        const textItems = await processTextInput(textInput);
        allItems = [...allItems, ...textItems];
      }

      if (allItems.length === 0) {
        setError('Please add items using photo, upload, or text input before shopping.');
      } else {
        // Append new items to existing items
        setItems(prevItems => [...prevItems, ...allItems]);
        // Clear inputs after adding
        setPendingImageData(null);
        setImage(null);
        setTextInput('');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError('Failed to process your shopping list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setPendingImageData(null);
    setTextInput('');
    setItems([]);
    setError('');
    setIsListening(false);
    setEditingIndex(null);
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  const handleClearCart = () => {
    setItems([]);
    setEditingIndex(null);
  };

  const handleOpenAllItems = () => {
    // Create a single combined URL list that can be copied
    const allUrls = items.map(item => 
      `https://www.bigbasket.com/ps/?q=${encodeURIComponent(item.searchTerm)}`
    ).join('\n');
    
    // Try to open tabs (may be blocked by Claude's popup)
    items.forEach((item, index) => {
      setTimeout(() => {
        const url = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(item.searchTerm)}`;
        window.open(url, '_blank');
      }, index * 150);
    });
  };

  const handleDeleteItem = (index) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleEditItem = (index) => {
    setEditingIndex(index);
    setEditedItemName(items[index].item);
  };

  const handleSaveEdit = (index) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        item: editedItemName,
        searchTerm: editedItemName.toLowerCase()
      };
      return newItems;
    });
    setEditingIndex(null);
    setEditedItemName('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedItemName('');
  };

  const openBigBasket = (searchTerm) => {
    const url = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`;
    const newTab = window.open(url, '_blank');
    if (newTab) {
      newTab.blur();
      window.focus();
    }
  };

  const addToCart = async (searchTerm) => {
    const searchUrl = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`;
    const newTab = window.open(searchUrl, '_blank');
    if (newTab) {
      newTab.blur();
      window.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center mb-4 relative">
            <ShoppingCart className="w-12 h-12 text-green-600" />
            <button
              onClick={handleReset}
              className="absolute right-4 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors"
              title="Reset and start over"
            >
              <RotateCcw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            BigBasket Grocery Scanner
          </h1>
          <p className="text-gray-600">
            Snap your shopping list, get instant BigBasket links
          </p>
        </div>

        {/* Upload Section */}
        {!showCamera ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Camera Button */}
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-green-300 rounded-xl hover:bg-green-50 transition-colors"
              >
                <Camera className="w-12 h-12 text-green-500 mb-3" />
                <p className="text-lg font-semibold text-gray-700 mb-1">
                  Take Photo
                </p>
                <p className="text-sm text-gray-500 text-center px-2">
                  AI-powered (smart)
                </p>
              </button>

              {/* Upload Button - Claude API */}
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-green-300 rounded-xl cursor-pointer hover:bg-green-50 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <ShoppingCart className="w-12 h-12 text-green-500 mb-3" />
                  <p className="text-lg font-semibold text-gray-700 mb-1">
                    Upload Image
                  </p>
                  <p className="text-sm text-gray-500 text-center px-2">
                    AI-powered (smart)
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>

              {/* Upload Button - Tesseract */}
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors">
                <div className="flex flex-col items-center justify-center">
                  <Camera className="w-12 h-12 text-blue-500 mb-3" />
                  <p className="text-lg font-semibold text-gray-700 mb-1">
                    Upload - Tesseract
                  </p>
                  <p className="text-sm text-gray-500 text-center px-2">
                    Fast & reliable (no limits)
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleTesseractUpload}
                  disabled={tesseractLoading}
                />
              </label>
            </div>

            {image && (
              <div className="mt-4">
                <img
                  src={image}
                  alt="Uploaded shopping list"
                  className="w-full h-48 object-contain rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-96 object-cover rounded-lg bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Capture
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Text Input Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Add more items
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Type items in English or Hindi (e.g., "2 kg tomatoes, 1L दूध, bread") or use voice input
          </p>
          
          <div className="flex gap-3">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter items here... (English or Hindi)"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none resize-none h-24"
              disabled={loading}
            />
            
            <button
              onClick={toggleVoiceInput}
              disabled={loading}
              className={`px-4 rounded-lg transition-all flex items-center justify-center ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
          </div>
          
          {isListening && (
            <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
              <span className="animate-pulse">🎤</span>
              Listening... Speak in Hindi or English
            </p>
          )}
          
          <button
            onClick={handleLetsShop}
            disabled={loading || (!pendingImageData && !textInput.trim())}
            className={`w-full mt-4 px-6 py-4 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2 ${
              !loading && (pendingImageData || textInput.trim())
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ShoppingCart className="w-6 h-6" />
            Let's Shop!
          </button>
        </div>

        {/* Loading State */}
        {(loading || tesseractLoading) && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">
              {tesseractLoading ? 'Processing image with Tesseract...' : 'Analyzing your shopping list...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 mb-1">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-green-600 text-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold">
                    Found {items.length} items
                  </h2>
                  <p className="text-green-100 text-sm mt-1">
                    Ready to shop on BigBasket
                  </p>
                </div>
                <button
                  onClick={handleClearCart}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Cart
                </button>
              </div>
              
              <button
                onClick={handleOpenAllItems}
                className="w-full bg-white text-green-600 px-6 py-3 rounded-lg font-bold text-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <ExternalLink className="w-5 h-5" />
                Open All {items.length} Items in BigBasket
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {editingIndex === index ? (
                        <div className="mb-3">
                          <input
                            type="text"
                            value={editedItemName}
                            onChange={(e) => setEditedItemName(e.target.value)}
                            className="w-full px-3 py-2 border-2 border-green-500 rounded-lg focus:outline-none text-lg font-semibold"
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleSaveEdit(index)}
                              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex items-center gap-1 bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-800 text-lg">
                            {item.item}
                          </h3>
                          <button
                            onClick={() => handleEditItem(index)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Edit item"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(index)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-600 mb-3">
                        Quantity: {item.quantity}
                      </p>
                      
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => addToCart(item.searchTerm)}
                          className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors w-full sm:w-auto"
                        >
                          <Plus className="w-4 h-4" />
                          Add to Cart
                        </button>
                        
                        <button
                          onClick={() => openBigBasket(item.searchTerm)}
                          className="flex items-center justify-center gap-2 bg-white text-green-600 border-2 border-green-600 px-4 py-2.5 rounded-lg font-medium hover:bg-green-50 transition-colors w-full sm:w-auto"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Search on BigBasket
                        </button>

                        {item.alternative && (
                          <button
                            onClick={() => openBigBasket(item.alternative)}
                            className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm w-full sm:w-auto"
                          >
                            Alternative: {item.alternative}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                💡 Tip: Add more items and click "Let's Shop!" to append to this list
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!image && !loading && items.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-bold text-gray-800 mb-4">How it works:</h3>
            <ol className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span>Upload a photo, type, or speak your grocery list (supports Hindi and English)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span>AI extracts and normalizes all items with smart quantity detection</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <span>Click "Let's Shop!" to process all inputs together</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <span>Get instant BigBasket links for all items - complete your shopping in minutes!</span>
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
