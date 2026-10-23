import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/index.js';

let server;
let baseUrl;

before(async () => {
  process.env.NODE_ENV = 'test';
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('Food Ordering Backend Test Suite', () => {

  test('GET /api/health should report server online status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'online');
    assert.ok(data.services);
  });

  test('GET /api/foods should return available food catalog with categories', async () => {
    const res = await fetch(`${baseUrl}/api/foods`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    assert.ok(body.data[0].name);
    assert.ok(body.data[0].price);
  });

  test('GET /api/foods/categories should return food categories', async () => {
    const res = await fetch(`${baseUrl}/api/foods/categories`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 4);
  });

  test('POST /api/orders should reject invalid payloads with 400', async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'J',
        customer_email: 'not-an-email',
        items: []
      })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.details.length > 0);
  });

  test('POST /api/orders should tamper-proof pricing: server calculates trusted totals', async () => {
    // Attempting to send a forged unit price ($0.01) and total ($0.01)
    const forgedPayload = {
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '+1 555-0199',
      delivery_address: '123 Test Street, Springfield',
      payment_method: 'card_demo',
      items: [
        {
          food_id: 'f1000000-0000-0000-0000-000000000001', // Truffle Umami Double Smash ($15.99)
          quantity: 2,
          unit_price: 0.01, // Client attempts to override
          subtotal: 0.02
        }
      ]
    };

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forgedPayload)
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.order_number);

    // 2 x 15.99 = 31.98. Tax at 8.25% = 2.64. Delivery fee = 4.99.
    // Grand total must be 39.61, completely ignoring client's fake 0.01 price!
    assert.equal(body.data.subtotal, 31.98);
    assert.equal(body.data.total_amount, 39.61);
    assert.equal(body.data.items[0].unit_price, 15.99);
  });

  test('GET /api/orders/my-orders requires Bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/orders/my-orders`);
    assert.equal(res.status, 401);
  });

  test('GET /api/admin/metrics rejects unauthenticated access with 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics`);
    assert.equal(res.status, 401);
  });

  test('GET /api/admin/metrics rejects customer role with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { Authorization: 'Bearer demo-customer-token' }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('GET /api/admin/metrics allows verified admin role', async () => {
    const res = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: { Authorization: 'Bearer demo-admin-token' }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.totalOrders >= 0);
    assert.ok(body.data.totalRevenue >= 0);
  });

  test('PATCH /api/admin/orders/:id/status allows admin to update status', async () => {
    const res = await fetch(`${baseUrl}/api/admin/orders/ord-mock-001/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-admin-token'
      },
      body: JSON.stringify({ status: 'out_for_delivery' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'out_for_delivery');
  });

});
