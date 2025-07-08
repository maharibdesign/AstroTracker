const { supabase } = require('./_lib/supabaseClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { userId, trackerData } = req.body;
    if (!userId || !trackerData) return res.status(400).json({ message: 'User ID and tracker data are required.' });

    // 'upsert' will create a new row if one doesn't exist, or update it if it does. Perfect for our use case.
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, data: trackerData, updated_at: new Date() });

    if (error) throw error;
    
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};