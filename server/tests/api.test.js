import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/index.js';
import { setAdminClientForTesting } from '../src/services/supabase.js';
import { sheetsService } from '../src/services/sheetsService.js';

let server;
let baseUrl;

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_DEMO_AUTH = 'true';
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-customer-token'
      },
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
    const mockClient = {
      rpc: async (fnName, params) => {
        return {
          data: {
            id: 'ord-price-test',
            order_number: params.p_order.order_number,
            user_id: params.p_order.user_id,
            subtotal: 31.98,
            tax: 2.64,
            delivery_fee: 4.99,
            total_amount: 39.61,
            items: [
              {
                food_id: params.p_items[0].food_id,
                food_name: 'Truffle Umami Double Smash',
                unit_price: 15.99,
                quantity: params.p_items[0].quantity,
                subtotal: 31.98
              }
            ]
          },
          error: null
        };
      }
    };
    setAdminClientForTesting(mockClient);

    try {
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-customer-token'
        },
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
    } finally {
      setAdminClientForTesting(null);
    }
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
    const mockAdminClient = {
      from: () => ({
        update: (data) => ({
          eq: (field, val) => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: val,
                  status: data.status,
                  order_number: 'ORD-TEST-001'
                },
                error: null
              })
            })
          })
        })
      })
    };
    setAdminClientForTesting(mockAdminClient);

    try {
      const res = await fetch(`${baseUrl}/api/admin/orders/00000000-0000-0000-0000-000000000001/status`, {
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
    } finally {
      setAdminClientForTesting(null);
    }
  });

  test('POST /api/orders should call create_order_atomic RPC with only non-financial parameters', async () => {
    let capturedRpc = null;
    const mockClient = {
      rpc: async (fnName, params) => {
        capturedRpc = { fnName, params };
        return {
          data: {
            id: 'ord-atomic-mock-001',
            order_number: params.p_order.order_number,
            user_id: params.p_order.user_id,
            customer_name: params.p_order.customer_name,
            subtotal: 25.00,
            tax: 2.06,
            delivery_fee: 4.99,
            total_amount: 32.05,
            items: [
              {
                food_id: params.p_items[0].food_id,
                food_name: 'Classic Burger',
                unit_price: 12.50,
                quantity: params.p_items[0].quantity,
                subtotal: 25.00
              }
            ]
          },
          error: null
        };
      }
    };

    setAdminClientForTesting(mockClient);

    try {
      const forgedPayload = {
        customer_name: 'Atomic Test Customer',
        customer_email: 'atomic@example.com',
        customer_phone: '+1 555-0100',
        delivery_address: '789 Atomic Way',
        payment_method: 'card_demo',
        total_amount: 0.01, // Attempted financial forgery
        tax: 0.00,
        delivery_fee: 0.00,
        items: [
          {
            food_id: 'f0000000-0000-0000-0000-000000000001',
            quantity: 2,
            unit_price: 0.01, // Attempted line price forgery
            subtotal: 0.02
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-customer-token'
        },
        body: JSON.stringify(forgedPayload)
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);

      // Verify that create_order_atomic RPC was called
      assert.ok(capturedRpc, 'create_order_atomic RPC must be invoked');
      assert.equal(capturedRpc.fnName, 'create_order_atomic');

      // Verify that NO financial values were passed to the database
      assert.equal(capturedRpc.params.p_order.total_amount, undefined);
      assert.equal(capturedRpc.params.p_order.subtotal, undefined);
      assert.equal(capturedRpc.params.p_order.tax, undefined);
      assert.equal(capturedRpc.params.p_order.delivery_fee, undefined);

      // Verify item contains only food_id and quantity
      assert.equal(capturedRpc.params.p_items[0].unit_price, undefined);
      assert.equal(capturedRpc.params.p_items[0].subtotal, undefined);
      assert.equal(capturedRpc.params.p_items[0].food_id, 'f0000000-0000-0000-0000-000000000001');
      assert.equal(capturedRpc.params.p_items[0].quantity, 2);

      // Verify returned totals match the authoritative database calculation
      assert.equal(body.data.total_amount, 32.05);
      assert.equal(body.data.subtotal, 25.00);
    } finally {
      setAdminClientForTesting(null);
    }
  });

  test('POST /api/orders should return 400 and create no order if create_order_atomic fails', async () => {
    const mockFailingClient = {
      rpc: async () => ({
        data: null,
        error: { message: 'Item "Soldout Burger" is currently unavailable or sold out.' }
      })
    };

    setAdminClientForTesting(mockFailingClient);

    try {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-customer-token'
        },
        body: JSON.stringify({
          customer_name: 'Failing Test Customer',
          customer_email: 'fail@example.com',
          customer_phone: '+1 555-0101',
          delivery_address: '101 Error Blvd',
          items: [
            {
              food_id: 'f0000000-0000-0000-0000-000000000002',
              quantity: 1
            }
          ]
        })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.error.includes('unavailable or sold out'));
      assert.equal(body.data, undefined);
    } finally {
      setAdminClientForTesting(null);
    }
  });

  test('POST /api/orders rejects user-id spoofing: client-supplied user_id is ignored and null assigned', async () => {
    let capturedPayload = null;
    const mockClient = {
      rpc: async (fnName, params) => {
        capturedPayload = params.p_order;
        return {
          data: {
            id: 'ord-spoof-test',
            order_number: 'ORD-SPOOF-01',
            user_id: params.p_order.user_id,
            total_amount: 15.99,
            items: []
          },
          error: null
        };
      }
    };

    setAdminClientForTesting(mockClient);

    try {
      const spoofAttempt = {
        user_id: 'victim-0000-0000-0000-000000000099', // Attacker attempts to spoof victim
        customer_name: 'Attacker Bob',
        customer_email: 'attacker@example.com',
        customer_phone: '+1 555-0999',
        delivery_address: '404 Spoof Street',
        items: [
          {
            food_id: 'f1000000-0000-0000-0000-000000000001',
            quantity: 1
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-customer-token'
        },
        body: JSON.stringify(spoofAttempt)
      });

      assert.equal(res.status, 201);
      assert.ok(capturedPayload, 'RPC must be invoked');
      // Proves backend never trusts req.body.user_id and derives identity strictly from session:
      assert.equal(capturedPayload.user_id, '00000000-0000-0000-0000-000000000001', 'Order must be assigned strictly to authenticated session user_id');
    } finally {
      setAdminClientForTesting(null);
    }
  });

  test('POST /api/orders ignores forged status, payment_status, and sheets_synced in body', async () => {
    let capturedPayload = null;
    const mockClient = {
      rpc: async (fnName, params) => {
        capturedPayload = params.p_order;
        return {
          data: {
            id: 'ord-forged-test',
            order_number: 'ORD-FORGE-01',
            status: params.p_order.status,
            payment_status: params.p_order.payment_status,
            sheets_synced: params.p_order.sheets_synced,
            total_amount: 15.99,
            items: []
          },
          error: null
        };
      }
    };

    setAdminClientForTesting(mockClient);

    try {
      const forgedRequest = {
        customer_name: 'Attacker Bob',
        customer_email: 'attacker@example.com',
        customer_phone: '+1 555-0999',
        delivery_address: '404 Exploit Street',
        status: 'delivered', // Attacker claims order is delivered
        payment_status: 'paid', // Attacker claims already paid
        sheets_synced: true, // Attacker claims synced
        payment_method: 'cod',
        items: [
          {
            food_id: 'f1000000-0000-0000-0000-000000000001',
            quantity: 1
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-customer-token'
        },
        body: JSON.stringify(forgedRequest)
      });

      assert.equal(res.status, 201);
      assert.ok(capturedPayload, 'RPC must be invoked');
      // Proves backend assigns safe defaults, completely ignoring forged statuses:
      assert.equal(capturedPayload.status, 'pending', 'Status must default safely to pending');
      assert.equal(capturedPayload.payment_status, 'pending', 'COD payment_status must default to pending');
      assert.equal(capturedPayload.sheets_synced, false, 'sheets_synced must default to false');
    } finally {
      setAdminClientForTesting(null);
    }
  });

  test('PUT /api/auth/profile strictly blocks customer self-promotion to admin', async () => {
    const res = await fetch(`${baseUrl}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-customer-token'
      },
      body: JSON.stringify({
        full_name: 'Alice Customer Renamed',
        role: 'admin' // Attempted role escalation
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    // Role MUST remain customer
    assert.equal(body.profile.role, 'customer', 'Role must remain customer; cannot escalate to admin');
    assert.equal(body.profile.full_name, 'Alice Customer Renamed');
  });

  describe('Phase 1: Secure Authentication & Demo Elimination', () => {

    test('demo-admin-token is strictly rejected in production', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevAllow = process.env.ALLOW_DEMO_AUTH;
      try {
        process.env.NODE_ENV = 'production';
        process.env.ALLOW_DEMO_AUTH = 'true'; // Even if configured, production must block it

        // Case A: Missing Supabase client in production fails closed
        const resNoDb = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer demo-admin-token' }
        });
        assert.equal(resNoDb.status, 503);
        const bodyNoDb = await resNoDb.json();
        assert.equal(bodyNoDb.success, false);

        // Case B: Supabase client active, demo token rejected as invalid JWT
        const mockSupabase = {
          auth: {
            getUser: async (token) => ({
              data: { user: null },
              error: { message: 'Invalid JWT' }
            })
          }
        };
        setAdminClientForTesting(mockSupabase);

        const resWithDb = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer demo-admin-token' }
        });
        assert.equal(resWithDb.status, 401);
        const bodyWithDb = await resWithDb.json();
        assert.equal(bodyWithDb.success, false);
      } finally {
        setAdminClientForTesting(null);
        process.env.NODE_ENV = prevEnv;
        process.env.ALLOW_DEMO_AUTH = prevAllow;
      }
    });

    test('demo-customer-token is strictly rejected in production', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevAllow = process.env.ALLOW_DEMO_AUTH;
      try {
        process.env.NODE_ENV = 'production';
        process.env.ALLOW_DEMO_AUTH = 'true';

        // Case A: Missing Supabase fails closed with 503
        const resNoDb = await fetch(`${baseUrl}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-customer-token'
          },
          body: JSON.stringify({ full_name: 'Hacker' })
        });
        assert.equal(resNoDb.status, 503);
        const bodyNoDb = await resNoDb.json();
        assert.equal(bodyNoDb.success, false);

        // Case B: Active Supabase rejects demo token with 401
        const mockSupabase = {
          auth: {
            getUser: async (token) => ({
              data: { user: null },
              error: { message: 'Invalid JWT' }
            })
          }
        };
        setAdminClientForTesting(mockSupabase);

        const resWithDb = await fetch(`${baseUrl}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-customer-token'
          },
          body: JSON.stringify({ full_name: 'Hacker' })
        });
        assert.equal(resWithDb.status, 401);
        const bodyWithDb = await resWithDb.json();
        assert.equal(bodyWithDb.success, false);
      } finally {
        setAdminClientForTesting(null);
        process.env.NODE_ENV = prevEnv;
        process.env.ALLOW_DEMO_AUTH = prevAllow;
      }
    });

    test('Demo authentication works only when NODE_ENV !== "production" AND ALLOW_DEMO_AUTH === "true"', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevAllow = process.env.ALLOW_DEMO_AUTH;
      try {
        // 1. NODE_ENV=development but ALLOW_DEMO_AUTH=false -> REJECTED
        process.env.NODE_ENV = 'development';
        process.env.ALLOW_DEMO_AUTH = 'false';
        const resNoAllow = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer demo-admin-token' }
        });
        assert.notEqual(resNoAllow.status, 200, 'Must not authenticate demo token when ALLOW_DEMO_AUTH=false');

        // 2. NODE_ENV=development but ALLOW_DEMO_AUTH unset -> REJECTED
        delete process.env.ALLOW_DEMO_AUTH;
        const resUnset = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer demo-admin-token' }
        });
        assert.notEqual(resUnset.status, 200, 'Must not authenticate demo token when ALLOW_DEMO_AUTH is unset');

        // 3. NODE_ENV=production and ALLOW_DEMO_AUTH=true -> REJECTED
        process.env.NODE_ENV = 'production';
        process.env.ALLOW_DEMO_AUTH = 'true';
        const resProd = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer demo-admin-token' }
        });
        assert.notEqual(resProd.status, 200, 'Must not authenticate demo token in production even if ALLOW_DEMO_AUTH=true');

        // 4. NODE_ENV=test and ALLOW_DEMO_AUTH=true -> ACCEPTED
        process.env.NODE_ENV = 'test';
        process.env.ALLOW_DEMO_AUTH = 'true';
        const resValid = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer demo-admin-token' }
        });
        assert.equal(resValid.status, 200, 'Demo token must authenticate when both conditions are met');
      } finally {
        process.env.NODE_ENV = prevEnv;
        process.env.ALLOW_DEMO_AUTH = prevAllow;
      }
    });

    test('Missing Supabase configuration cannot create an authenticated production session (fails closed)', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevAllow = process.env.ALLOW_DEMO_AUTH;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.ALLOW_DEMO_AUTH;
        setAdminClientForTesting(null);

        // Production endpoints must fail with 503 rather than leaking or writing to mockStore
        const resOrders = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-customer-token'
          },
          body: JSON.stringify({
            customer_name: 'Prod Test',
            customer_email: 'prod@test.com',
            customer_phone: '+1 555-0100',
            delivery_address: '123 Prod Way',
            items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
          })
        });
        assert.equal(resOrders.status, 503);
        const bodyOrders = await resOrders.json();
        assert.equal(bodyOrders.success, false);
        assert.match(bodyOrders.error, /unavailable/i);

        const resTrack = await fetch(`${baseUrl}/api/orders/track/ORD-MOCK-001`);
        assert.equal(resTrack.status, 503);

        const resFoods = await fetch(`${baseUrl}/api/foods`);
        assert.equal(resFoods.status, 503);

        const resCats = await fetch(`${baseUrl}/api/foods/categories`);
        assert.equal(resCats.status, 503);
      } finally {
        setAdminClientForTesting(null);
        process.env.NODE_ENV = prevEnv;
        process.env.ALLOW_DEMO_AUTH = prevAllow;
      }
    });

    test('Unauthenticated requests to admin routes receive HTTP 401', async () => {
      const endpoints = [
        { path: '/api/admin/metrics', method: 'GET' },
        { path: '/api/admin/orders', method: 'GET' },
        { path: '/api/admin/orders/ord-mock-001/status', method: 'PATCH', body: { status: 'confirmed' } },
        { path: '/api/admin/foods', method: 'POST', body: { name: 'New Food' } }
      ];

      for (const ep of endpoints) {
        const opts = {
          method: ep.method,
          headers: ep.body ? { 'Content-Type': 'application/json' } : {}
        };
        if (ep.body) opts.body = JSON.stringify(ep.body);

        const res = await fetch(`${baseUrl}${ep.path}`, opts);
        assert.equal(res.status, 401, `Expected 401 for unauthenticated ${ep.method} ${ep.path}`);
        const body = await res.json();
        assert.equal(body.success, false);
      }
    });

    test('Authenticated customers attempting admin operations receive HTTP 403', async () => {
      // 1. With demo customer token (in test environment)
      const resDemoCust = await fetch(`${baseUrl}/api/admin/metrics`, {
        headers: { Authorization: 'Bearer demo-customer-token' }
      });
      assert.equal(resDemoCust.status, 403);
      const bodyDemoCust = await resDemoCust.json();
      assert.equal(bodyDemoCust.success, false);
      assert.match(bodyDemoCust.error, /Administrative privileges are required/i);

      // 2. With verified customer JWT against Supabase mock client
      const mockCustomerSupabase = {
        auth: {
          getUser: async (token) => {
            if (token === 'verified-customer-jwt') {
              return { data: { user: { id: 'cust-uuid-001', email: 'cust@example.com' } }, error: null };
            }
            return { data: { user: null }, error: { message: 'Invalid token' } };
          }
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'cust-uuid-001', email: 'cust@example.com', role: 'customer' },
                error: null
              })
            })
          })
        })
      };

      setAdminClientForTesting(mockCustomerSupabase);
      try {
        const resRealCust = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer verified-customer-jwt' }
        });
        assert.equal(resRealCust.status, 403);
        const bodyRealCust = await resRealCust.json();
        assert.equal(bodyRealCust.success, false);
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('A verified administrator can still access permitted admin routes with database role', async () => {
      const mockAdminUser = { id: 'admin-uuid-999', email: 'verified.admin@foodpro.app' };
      const mockAdminProfile = { id: 'admin-uuid-999', email: 'verified.admin@foodpro.app', role: 'admin' };

      const mockSupabaseAdmin = {
        auth: {
          getUser: async (token) => {
            if (token === 'verified-admin-jwt') {
              return { data: { user: mockAdminUser }, error: null };
            }
            return { data: { user: null }, error: { message: 'Invalid token' } };
          }
        },
        from: (table) => {
          if (table === 'profiles') {
            return {
              select: (cols) => {
                const promise = Promise.resolve({ data: [mockAdminProfile], error: null });
                promise.eq = (col, val) => ({
                  single: async () => ({ data: mockAdminProfile, error: null })
                });
                return promise;
              }
            };
          }
          if (table === 'orders') {
            return {
              select: () => Promise.resolve({
                data: [{ id: 'ord-db-001', total_amount: 45.50, status: 'confirmed' }],
                error: null
              })
            };
          }
          if (table === 'foods') {
            return {
              select: () => Promise.resolve({
                data: [{ id: 'food-db-001', is_available: true }],
                error: null
              })
            };
          }
          return {
            select: () => Promise.resolve({ data: [], error: null })
          };
        }
      };

      setAdminClientForTesting(mockSupabaseAdmin);
      try {
        const res = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer verified-admin-jwt' }
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.totalOrders, 1);
        assert.equal(body.data.totalRevenue, 45.50);
      } finally {
        setAdminClientForTesting(null);
      }
    });

  });

  describe('Phase 3: Admin Operations & Category Management Suite', () => {
    test('POST /api/admin/categories creates category with admin role and auto-derives slug', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-admin-token'
        },
        body: JSON.stringify({
          name: 'Wood-Fired Specialties',
          description: 'Slow-smoked and charred over hickory and oak.',
          sort_order: 10
        })
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.name, 'Wood-Fired Specialties');
      assert.equal(body.data.slug, 'wood-fired-specialties');
    });

    test('POST /api/admin/categories rejects invalid input (< 2 chars name) with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-admin-token'
        },
        body: JSON.stringify({ name: 'A' })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.details.some(d => d.includes('at least 2 characters')));
    });

    test('PUT /api/admin/categories/:id updates category details', async () => {
      // Create first
      const createRes = await fetch(`${baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-admin-token'
        },
        body: JSON.stringify({ name: 'Temp Category', sort_order: 5 })
      });
      const created = await createRes.json();

      const updateRes = await fetch(`${baseUrl}/api/admin/categories/${created.data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-admin-token'
        },
        body: JSON.stringify({ name: 'Updated Temp Category', sort_order: 9 })
      });

      assert.equal(updateRes.status, 200);
      const updateBody = await updateRes.json();
      assert.equal(updateBody.success, true);
      assert.equal(updateBody.data.name, 'Updated Temp Category');
    });

    test('DELETE /api/admin/categories/:id blocks deletion if foods reference it (HTTP 400)', async () => {
      // Mock category with linked foods
      const mockAdminClient = {
        from: (table) => {
          if (table === 'foods') {
            return {
              select: () => ({
                eq: async () => ({
                  data: [{ id: 'f-linked-1', name: 'Linked Burger' }],
                  error: null
                })
              })
            };
          }
          return {
            delete: () => ({
              eq: async () => ({ error: null })
            })
          };
        }
      };

      setAdminClientForTesting(mockAdminClient);
      try {
        const res = await fetch(`${baseUrl}/api/admin/categories/c-linked-001`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer demo-admin-token' }
        });

        assert.equal(res.status, 400);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.match(body.error, /Cannot delete category/i);
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('DELETE /api/admin/categories/:id deletes category when unlinked (HTTP 200)', async () => {
      const mockAdminClient = {
        from: (table) => {
          if (table === 'foods') {
            return {
              select: () => ({
                eq: async () => ({ data: [], error: null })
              })
            };
          }
          if (table === 'categories') {
            return {
              delete: () => ({
                eq: async () => ({ error: null })
              })
            };
          }
          return {};
        }
      };

      setAdminClientForTesting(mockAdminClient);
      try {
        const res = await fetch(`${baseUrl}/api/admin/categories/c-unlinked-001`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer demo-admin-token' }
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('Unauthenticated requests to category routes receive HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Sneaky Category' })
      });
      assert.equal(res.status, 401);
    });

    test('Customer role requests to category routes receive HTTP 403', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-customer-token'
        },
        body: JSON.stringify({ name: 'Customer Category' })
      });
      assert.equal(res.status, 403);
    });

    test('POST /api/admin/foods creates food item and validates price/name', async () => {
      // 1. Invalid price test
      const badRes = await fetch(`${baseUrl}/api/admin/foods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-admin-token'
        },
        body: JSON.stringify({ name: 'No Price Food', price: -5 })
      });
      assert.equal(badRes.status, 400);

      // 2. Valid creation test
      const goodRes = await fetch(`${baseUrl}/api/admin/foods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-admin-token'
        },
        body: JSON.stringify({
          name: 'Crispy Black Truffle Fries',
          price: 9.50,
          description: 'Hand-cut russet potatoes tossed in white truffle oil and parmigiano.',
          is_available: true
        })
      });
      assert.equal(goodRes.status, 201);
      const goodBody = await goodRes.json();
      assert.equal(goodBody.success, true);
      assert.equal(goodBody.data.name, 'Crispy Black Truffle Fries');
    });

    test('PUT /api/admin/foods/:id updates food item', async () => {
      const res = await fetch(`${baseUrl}/api/admin/foods/f1000000-0000-0000-0000-000000000001`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-admin-token'
        },
        body: JSON.stringify({
          name: 'Truffle Umami Double Smash Special',
          price: 17.50,
          is_available: true
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });

    test('PATCH /api/admin/foods/:id/toggle-availability flips availability flag', async () => {
      const res = await fetch(`${baseUrl}/api/admin/foods/f1000000-0000-0000-0000-000000000001/toggle-availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-admin-token'
        },
        body: JSON.stringify({ is_available: false })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });

    test('DELETE /api/admin/foods/:id removes food item', async () => {
      const res = await fetch(`${baseUrl}/api/admin/foods/f-temp-delete-001`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer demo-admin-token' }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });

    test('PATCH /api/admin/orders/:id/status rejects invalid status values with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/00000000-0000-0000-0000-000000000001/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-admin-token'
        },
        body: JSON.stringify({ status: 'invalid_status_xyz' })
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.error, /Invalid status/i);
    });

    test('GET /api/admin/customers returns sanitized customer list with privacy projection', async () => {
      const res = await fetch(`${baseUrl}/api/admin/customers`, {
        headers: { Authorization: 'Bearer demo-admin-token' }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      if (body.data.length > 0) {
        const first = body.data[0];
        assert.ok(first.email);
        assert.ok(first.role);
        // Ensure no internal auth hashes or tokens are exposed
        assert.equal(first.encrypted_password, undefined);
        assert.equal(first.access_token, undefined);
      }
    });

    test('GET /api/admin/metrics gracefully handles empty records', async () => {
      const mockEmptySupabase = {
        from: (table) => ({
          select: () => Promise.resolve({ data: [], error: null })
        })
      };

      setAdminClientForTesting(mockEmptySupabase);
      try {
        const res = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer demo-admin-token' }
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.totalRevenue, 0);
        assert.equal(body.data.totalOrders, 0);
        assert.equal(body.data.activeOrders, 0);
        assert.equal(body.data.totalCustomers, 0);
      } finally {
        setAdminClientForTesting(null);
      }
    });
  });

  describe('Phase 4: Order Placement & Payment Methods Suite', () => {
    const origSyncOrder = sheetsService.syncOrder;

    test('POST /api/orders accepts payment_method: "upi_demo" and assigns demo_paid status', async () => {
      let capturedRpc = null;
      const mockClient = {
        rpc: async (fnName, params) => {
          capturedRpc = { fnName, params };
          return {
            data: {
              id: 'ord-upi-001',
              order_number: 'ORD-TEST-UPI',
              user_id: params.p_order.user_id,
              customer_name: params.p_order.customer_name,
              customer_email: params.p_order.customer_email,
              payment_method: params.p_order.payment_method,
              payment_status: params.p_order.payment_status,
              status: 'pending',
              subtotal: 18.00,
              tax: 1.49,
              delivery_fee: 4.99,
              total_amount: 24.48,
              items: [
                {
                  id: 'item-upi-001',
                  food_id: params.p_items[0].food_id,
                  food_name: 'Margherita Pizza',
                  unit_price: 18.00,
                  quantity: params.p_items[0].quantity,
                  subtotal: 18.00
                }
              ]
            },
            error: null
          };
        },
        from: () => ({
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null })
          })
        })
      };

      setAdminClientForTesting(mockClient);
      sheetsService.syncOrder = async () => ({ success: true });

      try {
        const res = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-customer-token'
          },
          body: JSON.stringify({
            customer_name: 'UPI Customer',
            customer_email: 'upi@example.com',
            customer_phone: '+1 555-1234',
            delivery_address: '100 UPI Lane, Metropolis',
            payment_method: 'upi_demo',
            items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
          })
        });

        assert.equal(res.status, 201);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.payment_method, 'upi_demo');
        assert.equal(body.data.payment_status, 'demo_paid');
        assert.equal(capturedRpc.params.p_order.payment_method, 'upi_demo');
        assert.equal(capturedRpc.params.p_order.payment_status, 'demo_paid');
      } finally {
        sheetsService.syncOrder = origSyncOrder;
        setAdminClientForTesting(null);
      }
    });

    test('POST /api/orders accepts payment_method: "card_demo" and assigns demo_paid status', async () => {
      let capturedRpc = null;
      const mockClient = {
        rpc: async (fnName, params) => {
          capturedRpc = { fnName, params };
          return {
            data: {
              id: 'ord-card-001',
              order_number: 'ORD-TEST-CARD',
              user_id: params.p_order.user_id,
              customer_name: params.p_order.customer_name,
              customer_email: params.p_order.customer_email,
              payment_method: params.p_order.payment_method,
              payment_status: params.p_order.payment_status,
              status: 'pending',
              subtotal: 18.00,
              tax: 1.49,
              delivery_fee: 4.99,
              total_amount: 24.48,
              items: [{ food_id: params.p_items[0].food_id, quantity: 1 }]
            },
            error: null
          };
        },
        from: () => ({
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
        })
      };

      setAdminClientForTesting(mockClient);
      sheetsService.syncOrder = async () => ({ success: true });

      try {
        const res = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-customer-token'
          },
          body: JSON.stringify({
            customer_name: 'Card Customer',
            customer_email: 'card@example.com',
            customer_phone: '+1 555-5678',
            delivery_address: '200 Card Boulevard, Metropolis',
            payment_method: 'card_demo',
            items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
          })
        });

        assert.equal(res.status, 201);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.payment_method, 'card_demo');
        assert.equal(body.data.payment_status, 'demo_paid');
        assert.equal(capturedRpc.params.p_order.payment_method, 'card_demo');
        assert.equal(capturedRpc.params.p_order.payment_status, 'demo_paid');
      } finally {
        sheetsService.syncOrder = origSyncOrder;
        setAdminClientForTesting(null);
      }
    });

    test('POST /api/orders accepts payment_method: "cod" and assigns pending status', async () => {
      let capturedRpc = null;
      const mockClient = {
        rpc: async (fnName, params) => {
          capturedRpc = { fnName, params };
          return {
            data: {
              id: 'ord-cod-001',
              order_number: 'ORD-TEST-COD',
              user_id: params.p_order.user_id,
              customer_name: params.p_order.customer_name,
              customer_email: params.p_order.customer_email,
              payment_method: params.p_order.payment_method,
              payment_status: params.p_order.payment_status,
              status: 'pending',
              subtotal: 18.00,
              tax: 1.49,
              delivery_fee: 4.99,
              total_amount: 24.48,
              items: [{ food_id: params.p_items[0].food_id, quantity: 1 }]
            },
            error: null
          };
        },
        from: () => ({
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
        })
      };

      setAdminClientForTesting(mockClient);
      sheetsService.syncOrder = async () => ({ success: true });

      try {
        const res = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-customer-token'
          },
          body: JSON.stringify({
            customer_name: 'COD Customer',
            customer_email: 'cod@example.com',
            customer_phone: '+1 555-9012',
            delivery_address: '300 Cash Court, Metropolis',
            payment_method: 'cod',
            items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
          })
        });

        assert.equal(res.status, 201);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.payment_method, 'cod');
        assert.equal(body.data.payment_status, 'pending');
        assert.equal(capturedRpc.params.p_order.payment_method, 'cod');
        assert.equal(capturedRpc.params.p_order.payment_status, 'pending');
      } finally {
        sheetsService.syncOrder = origSyncOrder;
        setAdminClientForTesting(null);
      }
    });

    test('POST /api/orders rejects invalid payment method with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo-customer-token'
        },
        body: JSON.stringify({
          customer_name: 'Invalid Payment Tester',
          customer_email: 'invalid-pay@example.com',
          customer_phone: '+1 555-9999',
          delivery_address: '400 Hacker Way, Cyber City',
          payment_method: 'crypto_currency',
          items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
        })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.details.some(d => d.includes('Invalid payment method "crypto_currency"')));
    });

    test('POST /api/orders rejects database RPC error when RPC throws invalid payment method', async () => {
      const mockClient = {
        rpc: async () => {
          return {
            data: null,
            error: {
              message: 'Invalid payment method "unsupported". Permitted methods are "cod", "card_demo", or "upi_demo".'
            }
          };
        }
      };

      setAdminClientForTesting(mockClient);

      try {
        const res = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-customer-token'
          },
          body: JSON.stringify({
            customer_name: 'DB Error Tester',
            customer_email: 'db-err@example.com',
            customer_phone: '+1 555-9999',
            delivery_address: '500 SQL Lane, Database City',
            payment_method: 'upi_demo',
            items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
          })
        });

        assert.equal(res.status, 400);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.match(body.error, /Invalid payment method/);
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('POST /api/orders persists order header and line items atomically in response', async () => {
      const mockOrderRecord = {
        id: 'ord-persist-uuid-001',
        order_number: 'ORD-PERSIST-001',
        user_id: '00000000-0000-0000-0000-000000000001',
        customer_name: 'Persistence Tester',
        customer_email: 'persist@example.com',
        customer_phone: '+1 555-7777',
        delivery_address: '777 Atomicity Street',
        delivery_notes: 'Leave on porch',
        status: 'pending',
        subtotal: 35.98,
        tax: 2.97,
        delivery_fee: 4.99,
        total_amount: 43.94,
        payment_method: 'upi_demo',
        payment_status: 'demo_paid',
        sheets_synced: false,
        items: [
          {
            id: 'item-uuid-1',
            order_id: 'ord-persist-uuid-001',
            food_id: 'f1000000-0000-0000-0000-000000000001',
            food_name: 'Truffle Umami Double Smash',
            unit_price: 15.99,
            quantity: 2,
            subtotal: 31.98
          },
          {
            id: 'item-uuid-2',
            order_id: 'ord-persist-uuid-001',
            food_id: 'f1000000-0000-0000-0000-000000000002',
            food_name: 'Artisan Lemonade',
            unit_price: 4.00,
            quantity: 1,
            subtotal: 4.00
          }
        ]
      };

      const mockClient = {
        rpc: async () => ({ data: mockOrderRecord, error: null }),
        from: () => ({
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
        })
      };

      setAdminClientForTesting(mockClient);
      sheetsService.syncOrder = async () => ({ success: true });

      try {
        const res = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-customer-token'
          },
          body: JSON.stringify({
            customer_name: 'Persistence Tester',
            customer_email: 'persist@example.com',
            customer_phone: '+1 555-7777',
            delivery_address: '777 Atomicity Street',
            delivery_notes: 'Leave on porch',
            payment_method: 'upi_demo',
            items: [
              { food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 2 },
              { food_id: 'f1000000-0000-0000-0000-000000000002', quantity: 1 }
            ]
          })
        });

        assert.equal(res.status, 201);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.id, 'ord-persist-uuid-001');
        assert.equal(body.data.order_number, 'ORD-PERSIST-001');
        assert.equal(body.data.items.length, 2);
        assert.equal(body.data.items[0].food_name, 'Truffle Umami Double Smash');
        assert.equal(body.data.items[1].food_name, 'Artisan Lemonade');
      } finally {
        sheetsService.syncOrder = origSyncOrder;
        setAdminClientForTesting(null);
      }
    });

    test('POST /api/orders secondary Google Sheets sync updates sheets_synced = true upon webhook success', async () => {
      let updateCalled = false;
      let updatedPayload = null;

      const mockClient = {
        rpc: async (fnName, params) => ({
          data: {
            id: 'ord-sync-success-uuid',
            order_number: 'ORD-SYNC-SUCCESS',
            user_id: params.p_order.user_id,
            customer_name: params.p_order.customer_name,
            payment_method: 'upi_demo',
            payment_status: 'demo_paid',
            sheets_synced: false,
            items: []
          },
          error: null
        }),
        from: (table) => {
          assert.equal(table, 'orders');
          return {
            update: (payload) => {
              updateCalled = true;
              updatedPayload = payload;
              return {
                eq: (col, val) => {
                  assert.equal(col, 'id');
                  assert.equal(val, 'ord-sync-success-uuid');
                  return Promise.resolve({ data: null, error: null });
                }
              };
            }
          };
        }
      };

      setAdminClientForTesting(mockClient);
      sheetsService.syncOrder = async () => ({ success: true });

      try {
        const res = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-customer-token'
          },
          body: JSON.stringify({
            customer_name: 'Sync Tester',
            customer_email: 'sync@example.com',
            customer_phone: '+1 555-8888',
            delivery_address: '888 Webhook Way',
            payment_method: 'upi_demo',
            items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
          })
        });

        assert.equal(res.status, 201);
        await new Promise(r => setTimeout(r, 100));

        assert.equal(updateCalled, true);
        assert.equal(updatedPayload.sheets_synced, true);
        assert.ok(updatedPayload.sheets_synced_at);
      } finally {
        sheetsService.syncOrder = origSyncOrder;
        setAdminClientForTesting(null);
      }
    });

    test('POST /api/orders preserves Supabase order and leaves sheets_synced = false if webhook fails', async () => {
      let updateCalled = false;

      const mockClient = {
        rpc: async (fnName, params) => ({
          data: {
            id: 'ord-sync-fail-uuid',
            order_number: 'ORD-SYNC-FAIL',
            user_id: params.p_order.user_id,
            customer_name: params.p_order.customer_name,
            payment_method: 'upi_demo',
            payment_status: 'demo_paid',
            sheets_synced: false,
            items: []
          },
          error: null
        }),
        from: () => ({
          update: () => {
            updateCalled = true;
            return { eq: () => Promise.resolve({ data: null, error: null }) };
          }
        })
      };

      setAdminClientForTesting(mockClient);
      sheetsService.syncOrder = async () => ({ success: false, error: 'Apps Script timeout' });

      try {
        const res = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer demo-customer-token'
          },
          body: JSON.stringify({
            customer_name: 'Failover Tester',
            customer_email: 'failover@example.com',
            customer_phone: '+1 555-8888',
            delivery_address: '999 Failover Way',
            payment_method: 'upi_demo',
            items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
          })
        });

        assert.equal(res.status, 201);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.order_number, 'ORD-SYNC-FAIL');

        await new Promise(r => setTimeout(r, 100));

        assert.equal(updateCalled, false);
      } finally {
        sheetsService.syncOrder = origSyncOrder;
        setAdminClientForTesting(null);
      }
    });
  });

  describe('CORS and Production Security Headers', () => {
    test('CORS allows requests from localhost frontend origin', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'http://localhost:5173' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    });

    test('CORS allows requests from *.vercel.app deployment origins', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: { Origin: 'https://hang-tight-preview.vercel.app' }
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('access-control-allow-origin'), 'https://hang-tight-preview.vercel.app');
    });

    test('CORS allows requests with no origin header (server-to-server / curl)', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'online');
    });
  });

});


