import express from 'express';
import { getAdminClient } from '../services/supabase.js';
import { sheetsService } from '../services/sheetsService.js';
import { config } from '../config/env.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateOrderInput } from '../middleware/validation.js';
import { mockOrders, mockFoods } from '../services/mockStore.js';

const router = express.Router();

/**
 * Generates human-friendly unique order numbers (e.g. ORD-20261023-8472)
 */
function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

/**
 * POST /api/orders
 * Creates a verified order with server-calculated pricing and triggers Google Sheets sync
 */
router.post('/', validateOrderInput, async (req, res, next) => {
  const {
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    delivery_notes,
    payment_method = 'cod',
    items,
    user_id
  } = req.body;

  // Optional authentication: user may be logged in or ordering as registered guest
  let authenticatedUserId = user_id || null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      if (token === 'demo-customer-token') {
        authenticatedUserId = '00000000-0000-0000-0000-000000000001';
      } else {
        const supabase = getAdminClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) authenticatedUserId = user.id;
        }
      }
    } catch {
      // Proceed with provided or guest user_id
    }
  }

  const supabase = getAdminClient();

  try {
    let verifiedFoods = [];
    const foodIds = items.map(i => i.food_id);

    if (supabase) {
      const { data, error } = await supabase
        .from('foods')
        .select('id, name, price, is_available')
        .in('id', foodIds);

      if (error) {
        console.warn('Error fetching foods from Supabase, falling back to mock:', error.message);
        verifiedFoods = mockFoods.filter(f => foodIds.includes(f.id));
      } else {
        verifiedFoods = data;
      }
    } else {
      verifiedFoods = mockFoods.filter(f => foodIds.includes(f.id));
    }

    // 1. Authoritative price and availability verification
    const foodMap = new Map(verifiedFoods.map(f => [f.id, f]));
    const validatedOrderItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const dbFood = foodMap.get(item.food_id);
      if (!dbFood) {
        return res.status(400).json({
          success: false,
          error: `Food item with ID ${item.food_id} no longer exists.`
        });
      }

      if (!dbFood.is_available) {
        return res.status(400).json({
          success: false,
          error: `Item "${dbFood.name}" is currently sold out or unavailable.`
        });
      }

      const unitPrice = Number(dbFood.price);
      const qty = parseInt(item.quantity, 10);
      const lineSubtotal = Number((unitPrice * qty).toFixed(2));

      calculatedSubtotal += lineSubtotal;

      validatedOrderItems.push({
        food_id: dbFood.id,
        food_name: dbFood.name,
        unit_price: unitPrice,
        quantity: qty,
        subtotal: lineSubtotal
      });
    }

    // 2. Authoritative tax, delivery fee, and grand total calculations
    const subtotal = Number(calculatedSubtotal.toFixed(2));
    const tax = Number((subtotal * config.app.taxRate).toFixed(2));
    const deliveryFee = subtotal > 50 ? 0.00 : config.app.deliveryFee; // Free delivery over $50
    const totalAmount = Number((subtotal + tax + deliveryFee).toFixed(2));
    const orderNumber = generateOrderNumber();

    const orderPayload = {
      order_number: orderNumber,
      user_id: authenticatedUserId,
      customer_name: customer_name.trim(),
      customer_email: customer_email.trim().toLowerCase(),
      customer_phone: customer_phone.trim(),
      delivery_address: delivery_address.trim(),
      delivery_notes: delivery_notes ? delivery_notes.trim() : null,
      status: 'pending',
      subtotal,
      tax,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      payment_status: payment_method === 'cod' ? 'pending' : 'demo_paid',
      payment_method,
      sheets_synced: false,
      created_at: new Date().toISOString()
    };

    let createdOrder = null;

    if (supabase) {
      // Insert into Supabase
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderError) {
        console.error('Supabase order insert error:', orderError);
        throw new Error(`Failed to save order to Supabase: ${orderError.message}`);
      }

      createdOrder = orderData;

      // Insert Order Items
      const itemsToInsert = validatedOrderItems.map(item => ({
        order_id: createdOrder.id,
        food_id: item.food_id,
        food_name: item.food_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.subtotal
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)
        .select();

      if (itemsError) {
        console.error('Supabase order items error:', itemsError);
      }

      createdOrder.items = insertedItems || validatedOrderItems;
    } else {
      // In-memory fallback
      createdOrder = {
        ...orderPayload,
        id: `ord-mock-${Date.now()}`,
        items: validatedOrderItems.map((item, idx) => ({
          id: `item-mock-${Date.now()}-${idx}`,
          order_id: `ord-mock-${Date.now()}`,
          ...item
        }))
      };
      mockOrders.unshift(createdOrder);
    }

    // 3. Asynchronous Google Sheets secondary synchronization
    sheetsService.syncOrder(createdOrder).then(async (syncResult) => {
      if (syncResult && syncResult.success) {
        if (supabase) {
          await supabase
            .from('orders')
            .update({
              sheets_synced: true,
              sheets_synced_at: new Date().toISOString()
            })
            .eq('id', createdOrder.id);
        } else {
          createdOrder.sheets_synced = true;
          createdOrder.sheets_synced_at = new Date().toISOString();
        }
        console.info(`[GoogleSheets] Order ${orderNumber} synced.`);
      } else {
        console.warn(`[GoogleSheets] Order ${orderNumber} sync status: ${syncResult?.message || syncResult?.error}`);
      }
    }).catch(err => {
      console.error(`[GoogleSheets] Async sync exception for order ${orderNumber}:`, err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully and recorded in database.',
      data: createdOrder
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/my-orders
 * Returns all orders belonging to authenticated customer
 */
router.get('/my-orders', authenticateToken, async (req, res, next) => {
  const userId = req.user.id;
  const userEmail = req.user.email;
  const supabase = getAdminClient();

  if (!supabase) {
    const userOrders = mockOrders.filter(o => o.user_id === userId || o.customer_email === userEmail);
    return res.json({ success: true, count: userOrders.length, data: userOrders });
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (*)
      `)
      .or(`user_id.eq.${userId},customer_email.eq.${userEmail}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase my-orders fetch error, using fallback:', error.message);
      const fallback = mockOrders.filter(o => o.user_id === userId || o.customer_email === userEmail);
      return res.json({ success: true, count: fallback.length, data: fallback });
    }

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/track/:identifier
 * Public order status lookup by Order Number (e.g. ORD-20261023-1001) or ID
 */
router.get('/track/:identifier', async (req, res, next) => {
  const { identifier } = req.params;
  const supabase = getAdminClient();

  if (!supabase) {
    const order = mockOrders.find(o => o.id === identifier || o.order_number?.toLowerCase() === identifier.toLowerCase());
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found with provided tracking ID.' });
    }
    return res.json({ success: true, data: order });
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = supabase.from('orders').select(`*, items:order_items (*)`);
    if (isUuid) {
      query = query.eq('id', identifier);
    } else {
      query = query.ilike('order_number', identifier);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      const fallback = mockOrders.find(o => o.id === identifier || o.order_number?.toLowerCase() === identifier.toLowerCase());
      if (fallback) return res.json({ success: true, data: fallback });
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/:id
 * Single order details (only owner or admin can view)
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isAdmin = req.profile.role === 'admin';
  const supabase = getAdminClient();

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    if (!isAdmin && order.user_id !== userId && order.customer_email !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this order.' });
    }
    return res.json({ success: true, data: order });
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, items:order_items (*)`)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    if (!isAdmin && data.user_id !== userId && data.customer_email !== req.user.email) {
      return res.status(403).json({ success: false, error: 'Unauthorized to access this customer order.' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
