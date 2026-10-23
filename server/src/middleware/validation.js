/**
 * Validates order submission payload
 */
export function validateOrderInput(req, res, next) {
  const { customer_name, customer_email, customer_phone, delivery_address, items } = req.body;

  const errors = [];

  if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length < 2) {
    errors.push('Customer name is required and must be at least 2 characters.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!customer_email || !emailRegex.test(customer_email)) {
    errors.push('A valid customer email address is required.');
  }

  if (!customer_phone || typeof customer_phone !== 'string' || customer_phone.trim().length < 7) {
    errors.push('A valid phone number is required for delivery communication.');
  }

  if (!delivery_address || typeof delivery_address !== 'string' || delivery_address.trim().length < 5) {
    errors.push('A valid delivery address is required.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Order must contain at least one item.');
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.food_id) {
        errors.push(`Item at index ${i} is missing food_id.`);
      }
      if (!item.quantity || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
        errors.push(`Item at index ${i} must have a positive integer quantity.`);
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

/**
 * Validates food creation or update payload
 */
export function validateFoodInput(req, res, next) {
  const { name, price, category_id } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Food item name is required.');
  }

  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    errors.push('Valid price greater than or equal to 0 is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  next();
}

/**
 * Validates order status transitions
 */
export function validateStatusUpdate(req, res, next) {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  next();
}
