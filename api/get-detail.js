import { createClient as supabaseClient } from '@supabase/supabase-js';
import { createClient as redisClient } from 'redis';

const supabase = supabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const redis = redisClient({ url: process.env.REDIS_URL });

export default async function handler(req, res) {
  const { id } = req.query; // Menangkap ID dari URL, misal: /api/get-detail?id=1
  if (!id) return res.status(400).json({ error: "ID Koleksi diperlukan" });

  try {
    if (!redis.isOpen) await redis.connect();

    const cacheKey = `detail_koleksi_${id}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({ source: 'Redis Cache', data: JSON.parse(cachedData) });
    }

    // Ambil semua detail spesifik berdasarkan ID
    const { data, error } = await supabase.from('koleksi').select('*').eq('id', id).single();
    
    if (error) throw error;

    await redis.set(cacheKey, JSON.stringify(data), { EX: 60 }); // Cache 60 detik

    return res.status(200).json({ source: 'Supabase Database', data: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}