import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  // 1. Get the Bot Token from secure environment variables
  const BOT_TOKEN = import.meta.env.BOT_TOKEN;

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ success: false, message: "Bot token not configured." }), { status: 500 });
  }

  try {
    // 2. Get the PDF data and user ID from the frontend's request
    const { pdfBase64, userId } = await request.json();
    if (!pdfBase64 || !userId) {
      return new Response(JSON.stringify({ success: false, message: "Missing PDF data or user ID." }), { status: 400 });
    }

    // 3. Convert Base64 data into a file buffer that Telegram can understand
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

    // 4. Prepare the data for sending to the Telegram API
    // Telegram's API for sending files requires 'multipart/form-data'
    const formData = new FormData();
    formData.append('chat_id', userId);
    formData.append('caption', 'Here is your 30-Day AstroTracker Report!');
    formData.append('document', pdfBlob, 'AstroTracker-Report.pdf');

    // 5. Call the Telegram Bot API to send the document
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const responseData = await response.json();

    if (!response.ok) {
      // If Telegram's API returned an error, forward it
      console.error('Telegram API Error:', responseData);
      return new Response(JSON.stringify({ success: false, message: responseData.description || 'Failed to send PDF.' }), { status: response.status });
    }

    // 6. Return a success message to the frontend
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Error in API route:', error);
    return new Response(JSON.stringify({ success: false, message: 'An internal error occurred.' }), { status: 500 });
  }
};