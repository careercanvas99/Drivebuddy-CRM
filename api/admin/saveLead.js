import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client initialized with the Service Role Key.
 * Note: Service Role keys should NEVER be exposed in the frontend.
 * These environment variables must be set in the Vercel dashboard.
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only allow POST requests for creating records
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { customer_id, status, notes } = req.body;

  // Basic validation
  if (!customer_id) {
    return res.status(400).json({ error: 'Missing customer_id' });
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([
        { 
          customer_id, 
          status: status || 'new', 
          notes: notes || '',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Lead Save Error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Lead synchronized successfully with Service Role bypassing RLS',
      data 
    });
  } catch (err) {
    console.error('Internal Server Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}