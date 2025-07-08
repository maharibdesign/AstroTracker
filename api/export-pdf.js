const { supabase } = require('./_lib/supabaseClient');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default; // Use .default for CommonJS
const FormData = require('form-data');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) return res.status(500).json({ message: 'Server config error.' });

    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: 'User ID is required.' });

        const { data: profile, error } = await supabase.from('profiles').select('data').eq('id', userId).single();
        if (error || !profile) throw new Error('No data found for user. Please save progress first.');
        
        const trackerData = profile.data;
        
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("AstroTracker: 30-Day Transformation Report", 14, 22);
        const tableData = trackerData.map(day => [
            day.day, day.date, day.fitness.workout ? '✅' : '—', day.fitness.pushups,
            day.hydration.intake.toFixed(1), day.wellness.sleep.toFixed(1),
            Object.values(day.digestiveHealth).filter(Boolean).length ? 'Yes' : 'No'
        ]);
        autoTable(doc, {
            startY: 35, head: [['Day', 'Date', 'Workout', 'Push-ups', 'Water (L)', 'Sleep (h)', 'Symptoms']],
            body: tableData, theme: 'grid', headStyles: { fillColor: [44, 62, 80] }
        });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        
        const formData = new FormData();
        formData.append('chat_id', userId);
        formData.append('caption', 'Here is your 30-Day AstroTracker Report!');
        formData.append('document', pdfBuffer, { filename: 'AstroTracker-Report.pdf', contentType: 'application/pdf' });
        
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
        const tgResponse = await fetch(url, { method: 'POST', body: formData, headers: formData.getHeaders() });
        const tgResponseData = await tgResponse.json();

        if (!tgResponse.ok) throw new Error(tgResponseData.description || 'Failed to send PDF.');

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};