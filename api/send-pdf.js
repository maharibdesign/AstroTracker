// Using 'require' syntax for Node.js compatibility in Vercel serverless functions
const FormData = require('form-data');
const fetch = require('node-fetch'); // Vercel provides fetch, but this is a robust way

// This is the function Vercel will run.
module.exports = async (req, res) => {
  // Ensure this function only responds to POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error("Environment Variable 'BOT_TOKEN' is not set.");
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
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

    if (!tgResponse.ok) {
      console.error('Telegram API Error:', tgResponseData);
      return res.status(500).json({ success: false, message: tgResponseData.description || 'Failed to send PDF to Telegram.' });
    }

    // If everything is successful, send a 200 OK response
    return res.status(200).json({ success: true, message: 'PDF sent successfully.' });

  } catch (error) {
    console.error('Error in /api/send-pdf:', error);
    return res.status(500).json({ success: false, message: 'An internal error occurred.' });
  }
};