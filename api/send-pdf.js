const FormData = require('form-data');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({ success: false, message: 'Server configuration error: BOT_TOKEN is not set.' });
  }

  try {
    const { pdfBase64, userId } = req.body;
    if (!pdfBase64 || !userId) {
      return res.status(400).json({ success: false, message: 'Missing PDF data or user ID.' });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    
    const formData = new FormData();
    formData.append('chat_id', userId);
    formData.append('caption', 'Here is your 30-Day AstroTracker Report!');
    formData.append('document', pdfBuffer, {
      filename: 'AstroTracker-Report.pdf',
      contentType: 'application/pdf',
    });

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
    const tgResponse = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const tgResponseData = await tgResponse.json();
    if (!tgResponse.ok) throw new Error(tgResponseData.description || 'Failed to send PDF to Telegram.');
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
};