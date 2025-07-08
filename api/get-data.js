const { supabase } = require('./_lib/supabaseClient');

module.exports = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });

    const { data, error } = await supabase
      .from('profiles')
      .select('data')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error, handle it below

    if (data) {
      return res.status(200).json(data.data); // Return only the 'data' jsonb column
    } else {
      return res.status(404).json({ message: 'No data found.' });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};