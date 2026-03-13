import { createClient as supabaseClient } from '@supabase/supabase-js';
import { createClient as redisClient } from 'redis';

const supabase = supabaseClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const redis = redisClient({ url: process.env.REDIS_URL });

export default async function handler(req, res) {
  try {
    if (!redis.isOpen) await redis.connect();

    const cacheKey = 'katalog_koleksi';
    // 1. Cek apakah data ada di cache Redis
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({ source: 'Redis Cache', data: JSON.parse(cachedData) });
    }

    // 2. Jika tidak ada di cache, ambil dari Supabase
    // Kita hanya ambil id, judul, dan path foto untuk katalog awal
    const { data, error } = await supabase.from('koleksi').select('id, judul, path');
    
    if (error) throw error;

    // 3. Simpan data ke Redis untuk request berikutnya (Cache selama 60 detik)
    await redis.set(cacheKey, JSON.stringify(data), { EX: 60 });

    return res.status(200).json({ source: 'Supabase Database', data: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}