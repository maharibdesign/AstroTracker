import type { APIRoute } from 'astro';
import FormData from 'form-data'; // Use the Node.js-compatible library

export const POST: APIRoute = async ({ request }) => {
  const BOT_TOKEN = import.meta.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error("Vercel Environment Variable 'BOT_TOKEN' is not set.");
    return new Response(JSON.stringify({ success: false, message: "Server configuration error." }), { status: 500 });
  }

  try {
    const { pdfBase64, userId } = await request.json();
    if (!pdfBase64 || !userId) {
      return new Response(JSON.stringify({ success: false, message: "Missing PDF data or user ID." }), { status: 400 });
    }

    // Use Node.js's native Buffer to handle the file data. This is correct for a server environment.
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    
    // Use the 'form-data' library to construct the multipart request
    const formData = new FormData();
    formData.append('chat_id', userId);
    formData.append('caption', 'Here is your 30-Day AstroTracker Report!');
    // Append the buffer directly. The library handles the rest.
    formData.append('document', pdfBuffer, 'AstroTracker-Report.pdf');

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;

    // The library provides the correct headers for the fetch request
    const response = await fetch(url, {
      method: 'POST',
      body: formData as any, // Cast because Node's FormData and Fetch's Body types can clash
      headers: formData.getHeaders(),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Telegram API Error:', responseData);
      return new Response(JSON.stringify({ success: false, message: responseData.description || 'Failed to send PDF.' }), { status: response.status });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Error in API route:', error);
    return new Response(JSON.stringify({ success: false, message: 'An internal error occurred.' }), { status: 500 });
  }
};