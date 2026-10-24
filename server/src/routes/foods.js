import express from 'express';
import { getAdminClient } from '../services/supabase.js';
import { mockFoods, mockCategories } from '../services/mockStore.js';

const router = express.Router();

/**
 * GET /api/categories
 * Returns active food categories
 */
router.get('/categories', async (req, res, next) => {
  const supabase = getAdminClient();

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        error: 'Categories unavailable in production: Supabase connection is not configured.'
      });
    }
    return res.json({ success: true, data: mockCategories });
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      console.warn('Supabase categories error, falling back to mock data:', error.message);
      return res.json({ success: true, data: mockCategories });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/foods
 * Returns available foods with category filter, search query, and sorting
 */
router.get('/', async (req, res, next) => {
  const { category, search, sort, availableOnly } = req.query;
  const supabase = getAdminClient();

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        error: 'Food catalog unavailable in production: Supabase connection is not configured.'
      });
    }
    let result = [...mockFoods];

    if (availableOnly !== 'false') {
      result = result.filter(item => item.is_available);
    }

    if (category && category !== 'all') {
      result = result.filter(item => item.category_id === category || item.category_name?.toLowerCase() === category.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (sort === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return res.json({ success: true, count: result.length, data: result });
  }

  try {
    let query = supabase
      .from('foods')
      .select(`
        *,
        categories:category_id (id, name, slug)
      `);

    if (availableOnly !== 'false') {
      query = query.eq('is_available', true);
    }

    if (category && category !== 'all') {
      query = query.eq('category_id', category);
    }

    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    if (sort === 'price_asc') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price_desc') {
      query = query.order('price', { ascending: false });
    } else if (sort === 'rating') {
      query = query.order('rating', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      console.warn('Supabase foods fetch error, using mock data:', error.message);
      return res.json({ success: true, count: mockFoods.length, data: mockFoods });
    }

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/foods/:id
 * Single food item detail
 */
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  const supabase = getAdminClient();

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        error: 'Food item unavailable in production: Supabase connection is not configured.'
      });
    }
    const item = mockFoods.find(f => f.id === id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Food item not found' });
    }
    return res.json({ success: true, data: item });
  }

  try {
    const { data, error } = await supabase
      .from('foods')
      .select(`*, categories:category_id (*)`)
      .eq('id', id)
      .single();

    if (error || !data) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ success: false, error: 'Food item not found' });
      }
      const fallback = mockFoods.find(f => f.id === id);
      if (fallback) return res.json({ success: true, data: fallback });
      return res.status(404).json({ success: false, error: 'Food item not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
