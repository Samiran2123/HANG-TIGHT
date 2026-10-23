import express from 'express';
import { getAdminClient } from '../services/supabase.js';
import { sheetsService } from '../services/sheetsService.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validateFoodInput, validateStatusUpdate } from '../middleware/validation.js';
import { mockOrders, mockFoods, mockProfiles } from '../services/mockStore.js';

const router = express.Router();

// Enforce authentication & admin privilege on all routes in this router
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/metrics
 * Returns comprehensive business metrics
 */
router.get('/metrics', async (req, res, next) => {
  const supabase = getAdminClient();

  if (!supabase) {
    const totalRevenue = mockOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? Number(o.total_amount) : 0), 0);
    const pendingOrders = mockOrders.filter(o => ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)).length;
    const deliveredOrders = mockOrders.filter(o => o.status === 'delivered').length;

    return res.json({
      success: true,
      data: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders: mockOrders.length,
        activeOrders: pendingOrders,
        deliveredOrders,
        totalCustomers: mockProfiles.filter(p => p.role === 'customer').length,
        totalFoods: mockFoods.length,
        availableFoods: mockFoods.filter(f => f.is_available).length
      }
    });
  }

  try {
    const [ordersRes, foodsRes, profilesRes] = await Promise.all([
      supabase.from('orders').select('id, total_amount, status'),
      supabase.from('foods').select('id, is_available'),
      supabase.from('profiles').select('id, role')
    ]);

    const orders = ordersRes.data || [];
    const foods = foodsRes.data || [];
    const profiles = profilesRes.data || [];

    const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? Number(o.total_amount || 0) : 0), 0);
    const activeOrders = orders.filter(o => ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)).length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    res.json({
      success: true,
      data: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders: orders.length,
        activeOrders,
        deliveredOrders,
        totalCustomers: profiles.filter(p => p.role === 'customer').length,
        totalFoods: foods.length,
        availableFoods: foods.filter(f => f.is_available).length
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/orders
 * List all orders with filters
 */
router.get('/orders', async (req, res, next) => {
  const { status, search } = req.query;
  const supabase = getAdminClient();

  if (!supabase) {
    let orders = [...mockOrders];
    if (status && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      orders = orders.filter(o =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q)
      );
    }
    return res.json({ success: true, count: orders.length, data: orders });
  }

  try {
    let query = supabase
      .from('orders')
      .select(`*, items:order_items (*)`)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search && search.trim()) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 * Updates order status and synchronizes to Google Sheets
 */
router.patch('/orders/:id/status', validateStatusUpdate, async (req, res, next) => {
  const { id } = req.params;
  const { status, payment_status } = req.body;
  const supabase = getAdminClient();

  try {
    let updatedOrder = null;

    if (supabase) {
      const updateData = { status, updated_at: new Date().toISOString() };
      if (payment_status) updateData.payment_status = payment_status;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select(`*, items:order_items (*)`)
        .single();

      if (error) throw error;
      updatedOrder = data;
    } else {
      const idx = mockOrders.findIndex(o => o.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      mockOrders[idx].status = status;
      if (payment_status) mockOrders[idx].payment_status = payment_status;
      mockOrders[idx].updated_at = new Date().toISOString();
      updatedOrder = mockOrders[idx];
    }

    // Secondary Google Sheets status update
    sheetsService.updateOrderStatus(id, status, payment_status).catch(err => {
      console.error(`[GoogleSheets] Status sync update failed for ${id}:`, err.message);
    });

    res.json({
      success: true,
      message: `Order status updated to "${status}".`,
      data: updatedOrder
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/foods
 * Create food item
 */
router.post('/foods', validateFoodInput, async (req, res, next) => {
  const { name, category_id, description, price, image_url, is_available = true, preparation_time = 20, calories, tags = [] } = req.body;
  const supabase = getAdminClient();

  const foodPayload = {
    name: name.trim(),
    category_id: category_id || null,
    description: description ? description.trim() : '',
    price: Number(price),
    image_url: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    is_available: Boolean(is_available),
    preparation_time: Number(preparation_time) || 20,
    calories: calories ? Number(calories) : null,
    tags: Array.isArray(tags) ? tags : [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('foods')
        .insert([foodPayload])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ success: true, message: 'Food item created', data });
    } else {
      const newFood = { id: `food-mock-${Date.now()}`, ...foodPayload };
      mockFoods.unshift(newFood);
      return res.status(201).json({ success: true, message: 'Food item created', data: newFood });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/foods/:id
 * Update food item
 */
router.put('/foods/:id', validateFoodInput, async (req, res, next) => {
  const { id } = req.params;
  const { name, category_id, description, price, image_url, is_available, preparation_time, calories, tags } = req.body;
  const supabase = getAdminClient();

  const updatePayload = {
    name: name.trim(),
    category_id: category_id || null,
    description: description !== undefined ? description.trim() : undefined,
    price: Number(price),
    image_url: image_url || undefined,
    is_available: is_available !== undefined ? Boolean(is_available) : undefined,
    preparation_time: preparation_time !== undefined ? Number(preparation_time) : undefined,
    calories: calories !== undefined ? Number(calories) : undefined,
    tags: Array.isArray(tags) ? tags : undefined,
    updated_at: new Date().toISOString()
  };

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('foods')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: 'Food item updated', data });
    } else {
      const idx = mockFoods.findIndex(f => f.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Food not found' });
      mockFoods[idx] = { ...mockFoods[idx], ...updatePayload };
      return res.json({ success: true, message: 'Food item updated', data: mockFoods[idx] });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/foods/:id/toggle-availability
 * Instant toggle for 86ing / restoring items
 */
router.patch('/foods/:id/toggle-availability', async (req, res, next) => {
  const { id } = req.params;
  const { is_available } = req.body;
  const supabase = getAdminClient();

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('foods')
        .update({ is_available: Boolean(is_available), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, data });
    } else {
      const food = mockFoods.find(f => f.id === id);
      if (!food) return res.status(404).json({ success: false, error: 'Food not found' });
      food.is_available = is_available !== undefined ? Boolean(is_available) : !food.is_available;
      return res.json({ success: true, data: food });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/foods/:id
 * Delete food item
 */
router.delete('/foods/:id', async (req, res, next) => {
  const { id } = req.params;
  const supabase = getAdminClient();

  try {
    if (supabase) {
      const { error } = await supabase.from('foods').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true, message: 'Food item deleted successfully' });
    } else {
      const idx = mockFoods.findIndex(f => f.id === id);
      if (idx !== -1) mockFoods.splice(idx, 1);
      return res.json({ success: true, message: 'Food item deleted successfully' });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/customers
 * Customer directory with order counts
 */
router.get('/customers', async (req, res, next) => {
  const supabase = getAdminClient();

  if (!supabase) {
    return res.json({
      success: true,
      count: mockProfiles.length,
      data: mockProfiles.map(p => ({
        ...p,
        total_orders: mockOrders.filter(o => o.user_id === p.id || o.customer_email === p.email).length
      }))
    });
  }

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, count: profiles.length, data: profiles });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/sync-sheets
 * Resynchronizes pending unsynced orders to Google Sheets
 */
router.post('/sync-sheets', async (req, res, next) => {
  const supabase = getAdminClient();
  let unsyncedOrders = [];

  try {
    if (supabase) {
      const { data } = await supabase
        .from('orders')
        .select(`*, items:order_items (*)`)
        .eq('sheets_synced', false)
        .limit(20);

      unsyncedOrders = data || [];
    } else {
      unsyncedOrders = mockOrders.filter(o => !o.sheets_synced);
    }

    if (unsyncedOrders.length === 0) {
      return res.json({
        success: true,
        message: 'All orders are already in sync with Google Sheets.',
        syncedCount: 0
      });
    }

    let successCount = 0;
    let failedCount = 0;

    for (const order of unsyncedOrders) {
      const result = await sheetsService.syncOrder(order);
      if (result && result.success) {
        successCount++;
        if (supabase) {
          await supabase
            .from('orders')
            .update({ sheets_synced: true, sheets_synced_at: new Date().toISOString() })
            .eq('id', order.id);
        } else {
          order.sheets_synced = true;
          order.sheets_synced_at = new Date().toISOString();
        }
      } else {
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: `Batch sync complete: ${successCount} orders synchronized, ${failedCount} failed.`,
      syncedCount: successCount,
      failedCount
    });
  } catch (err) {
    next(err);
  }
});

export default router;
