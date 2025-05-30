import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be provided in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;