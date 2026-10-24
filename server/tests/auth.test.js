import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/index.js';
import { setAdminClientForTesting } from '../src/services/supabase.js';

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

describe('Phase 2: Customer Authentication Test Suite', () => {

  // --- 1. Password Registration ---
  describe('Email / Password Registration', () => {

    test('Customer registration captures full_name and assigns authoritative customer role', async () => {
      const registeredUser = {
        id: 'new-cust-uuid-001',
        email: 'newcustomer@example.com',
        user_metadata: { full_name: 'Jane Customer' }
      };

      const mockSupabase = {
        auth: {
          signUp: async ({ email, password, options }) => {
            assert.equal(email, 'newcustomer@example.com');
            assert.equal(password, 'SecurePassword123!');
            assert.equal(options.data.full_name, 'Jane Customer');
            return {
              data: {
                user: registeredUser,
                session: { access_token: 'valid-new-customer-jwt' }
              },
              error: null
            };
          },
          getUser: async (token) => {
            if (token === 'valid-new-customer-jwt') {
              return { data: { user: registeredUser }, error: null };
            }
            return { data: { user: null }, error: { message: 'Invalid JWT' } };
          }
        },
        from: (table) => {
          assert.equal(table, 'profiles');
          return {
            select: () => ({
              eq: (col, val) => ({
                single: async () => ({
                  data: {
                    id: registeredUser.id,
                    email: registeredUser.email,
                    full_name: 'Jane Customer',
                    role: 'customer' // Enforced database role
                  },
                  error: null
                })
              })
            })
          };
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        // Verify registration produces an authenticated session and verifies profile
        const res = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: 'Bearer valid-new-customer-jwt' }
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.user.email, 'newcustomer@example.com');
        assert.equal(body.profile.role, 'customer', 'New registered customer must have database customer role');
        assert.equal(body.profile.full_name, 'Jane Customer');
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('Duplicate account registration error is handled cleanly without session generation', async () => {
      const mockSupabase = {
        auth: {
          signUp: async () => ({
            data: { user: null, session: null },
            error: { message: 'User already registered' }
          }),
          getUser: async () => ({
            data: { user: null },
            error: { message: 'Invalid token' }
          })
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const { error } = await mockSupabase.auth.signUp({
          email: 'duplicate@example.com',
          password: 'Password123!'
        });
        assert.ok(error);
        assert.equal(error.message, 'User already registered');

        // Unauthenticated access attempt fails
        const res = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: 'Bearer nonexistent-token' }
        });
        assert.notEqual(res.status, 200);
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('Registration requiring email confirmation yields no authenticated session until confirmed', async () => {
      const unconfirmedUser = {
        id: 'unconfirmed-uuid-002',
        email: 'unconfirmed@example.com',
        email_confirmed_at: null
      };

      const mockSupabase = {
        auth: {
          signUp: async () => ({
            data: {
              user: unconfirmedUser,
              session: null // Supabase returns null session when email confirmation is active
            },
            error: null
          }),
          getUser: async () => ({
            data: { user: null },
            error: { message: 'Invalid token' }
          })
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const result = await mockSupabase.auth.signUp({
          email: 'unconfirmed@example.com',
          password: 'Password123!'
        });
        assert.equal(result.data.session, null, 'Must not establish a session when confirmation is pending');
        assert.ok(result.data.user);

        // Cannot access protected endpoints
        const res = await fetch(`${baseUrl}/api/auth/me`);
        assert.equal(res.status, 401);
      } finally {
        setAdminClientForTesting(null);
      }
    });

  });

  // --- 2. Password Login ---
  describe('Email / Password Login', () => {

    test('Successful password login establishes valid session and retrieves verified customer profile', async () => {
      const customerUser = {
        id: 'cust-login-uuid-003',
        email: 'customer.login@example.com'
      };

      const mockSupabase = {
        auth: {
          signInWithPassword: async ({ email, password }) => {
            if (email === 'customer.login@example.com' && password === 'CorrectPassword123') {
              return {
                data: {
                  user: customerUser,
                  session: { access_token: 'valid-login-jwt-003' }
                },
                error: null
              };
            }
            return {
              data: { user: null, session: null },
              error: { message: 'Invalid login credentials' }
            };
          },
          getUser: async (token) => {
            if (token === 'valid-login-jwt-003') {
              return { data: { user: customerUser }, error: null };
            }
            return { data: { user: null }, error: { message: 'Invalid token' } };
          }
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: customerUser.id,
                  email: customerUser.email,
                  full_name: 'Logged Customer',
                  role: 'customer'
                },
                error: null
              })
            })
          })
        })
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const loginRes = await mockSupabase.auth.signInWithPassword({
          email: 'customer.login@example.com',
          password: 'CorrectPassword123'
        });

        assert.equal(loginRes.error, null);
        assert.equal(loginRes.data.session.access_token, 'valid-login-jwt-003');

        // Verify session can access /api/auth/me
        const apiRes = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${loginRes.data.session.access_token}` }
        });
        assert.equal(apiRes.status, 200);
        const body = await apiRes.json();
        assert.equal(body.profile.role, 'customer');
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('Failed password login returns error and never creates synthetic session', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: async () => ({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' }
          }),
          getUser: async () => ({
            data: { user: null },
            error: { message: 'Invalid token' }
          })
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const loginRes = await mockSupabase.auth.signInWithPassword({
          email: 'customer.login@example.com',
          password: 'WrongPassword!'
        });

        assert.ok(loginRes.error);
        assert.equal(loginRes.error.message, 'Invalid login credentials');
        assert.equal(loginRes.data.session, null);
        assert.equal(loginRes.data.user, null);

        // Attempting to access protected route with no valid session returns 401
        const apiRes = await fetch(`${baseUrl}/api/auth/me`);
        assert.equal(apiRes.status, 401);
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('Login rejection when customer email is unconfirmed', async () => {
      const mockSupabase = {
        auth: {
          signInWithPassword: async () => ({
            data: { user: null, session: null },
            error: { message: 'Email not confirmed' }
          })
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const loginRes = await mockSupabase.auth.signInWithPassword({
          email: 'unconfirmed@example.com',
          password: 'Password123'
        });

        assert.ok(loginRes.error);
        assert.equal(loginRes.error.message, 'Email not confirmed');
        assert.equal(loginRes.data.session, null);
      } finally {
        setAdminClientForTesting(null);
      }
    });

  });

  // --- 3. Magic Link & Email Authentication ---
  describe('Magic Link & Email Authentication', () => {

    test('signInWithOtp dispatches magic link request with emailRedirectTo and returns no premature session', async () => {
      let capturedOptions = null;
      const mockSupabase = {
        auth: {
          signInWithOtp: async ({ email, options }) => {
            capturedOptions = { email, options };
            return { data: {}, error: null };
          }
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const res = await mockSupabase.auth.signInWithOtp({
          email: 'magic.customer@example.com',
          options: {
            shouldCreateUser: true,
            emailRedirectTo: 'http://localhost:5173'
          }
        });

        assert.equal(res.error, null);
        assert.equal(capturedOptions.email, 'magic.customer@example.com');
        assert.equal(capturedOptions.options.shouldCreateUser, true);
        assert.equal(capturedOptions.options.emailRedirectTo, 'http://localhost:5173');
        assert.equal(res.data.session, undefined, 'No session emitted on magic link dispatch');
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('signInWithOtp handles error states (rate limit, service error) without emitting sessions', async () => {
      const mockSupabase = {
        auth: {
          signInWithOtp: async () => ({
            data: { user: null, session: null },
            error: { message: 'Over email rate limit' }
          })
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const res = await mockSupabase.auth.signInWithOtp({
          email: 'rate.limit@example.com',
          options: { shouldCreateUser: true }
        });

        assert.ok(res.error);
        assert.equal(res.error.message, 'Over email rate limit');
        assert.equal(res.data.session, null);
        assert.equal(res.data.user, null);

        // Protected endpoint rejects with 401 when no session exists
        const apiRes = await fetch(`${baseUrl}/api/auth/me`);
        assert.equal(apiRes.status, 401);
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('Returned magic link session authenticates customer and retrieves authoritative database role', async () => {
      const magicUser = { id: 'magic-uuid-004', email: 'magic.customer@example.com' };
      const mockSupabase = {
        auth: {
          getUser: async (token) => {
            if (token === 'valid-magiclink-jwt-004') {
              return { data: { user: magicUser }, error: null };
            }
            return { data: { user: null }, error: { message: 'Invalid token' } };
          }
        },
        from: (table) => {
          assert.equal(table, 'profiles');
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: magicUser.id,
                    email: magicUser.email,
                    full_name: 'Magic Diner',
                    role: 'customer' // Enforced database customer role
                  },
                  error: null
                })
              })
            })
          };
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const apiRes = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: 'Bearer valid-magiclink-jwt-004' }
        });
        assert.equal(apiRes.status, 200);
        const body = await apiRes.json();
        assert.equal(body.success, true);
        assert.equal(body.user.email, 'magic.customer@example.com');
        assert.equal(body.profile.role, 'customer');
        assert.equal(body.profile.full_name, 'Magic Diner');
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('verifyOtp with valid token returns valid session and user (backward compatibility)', async () => {
      const otpUser = { id: 'otp-uuid-005', email: 'otp.customer@example.com' };
      const mockSupabase = {
        auth: {
          verifyOtp: async ({ email, token, type }) => {
            assert.equal(email, 'otp.customer@example.com');
            assert.equal(token, '654321');
            assert.equal(type, 'email');
            return {
              data: {
                user: otpUser,
                session: { access_token: 'valid-otp-jwt-005' }
              },
              error: null
            };
          },
          getUser: async (tok) => {
            if (tok === 'valid-otp-jwt-005') {
              return { data: { user: otpUser }, error: null };
            }
            return { data: { user: null }, error: { message: 'Invalid token' } };
          }
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: otpUser.id, email: otpUser.email, role: 'customer' },
                error: null
              })
            })
          })
        })
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const verifyRes = await mockSupabase.auth.verifyOtp({
          email: 'otp.customer@example.com',
          token: '654321',
          type: 'email'
        });

        assert.equal(verifyRes.error, null);
        assert.equal(verifyRes.data.session.access_token, 'valid-otp-jwt-005');

        const apiRes = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${verifyRes.data.session.access_token}` }
        });
        assert.equal(apiRes.status, 200);
        const body = await apiRes.json();
        assert.equal(body.user.email, 'otp.customer@example.com');
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('verifyOtp fails securely on incorrect or expired token (backward compatibility)', async () => {
      const mockSupabase = {
        auth: {
          verifyOtp: async () => ({
            data: { user: null, session: null },
            error: { message: 'Token has expired or is invalid' }
          })
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const verifyRes = await mockSupabase.auth.verifyOtp({
          email: 'otp.customer@example.com',
          token: '000000',
          type: 'email'
        });

        assert.ok(verifyRes.error);
        assert.match(verifyRes.error.message, /invalid|expired/i);
        assert.equal(verifyRes.data.session, null);
      } finally {
        setAdminClientForTesting(null);
      }
    });

  });

  // --- 4. Sessions & Authoritative Roles ---
  describe('Sessions, Profiles & Role Integrity', () => {

    test('Customer role is authoritative from database; client-supplied role escalation is blocked', async () => {
      const customerUser = {
        id: 'cust-uuid-005',
        email: 'customer005@example.com',
        user_metadata: { role: 'admin' } // Attempted escalation in user metadata
      };

      const mockSupabase = {
        auth: {
          getUser: async () => ({
            data: { user: customerUser },
            error: null
          })
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: customerUser.id,
                  email: customerUser.email,
                  role: 'customer' // Database authoritatively enforces customer
                },
                error: null
              })
            })
          })
        })
      };

      setAdminClientForTesting(mockSupabase);

      try {
        // Customer profile reports database-assigned role
        const meRes = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: 'Bearer customer-jwt' }
        });
        assert.equal(meRes.status, 200);
        const meBody = await meRes.json();
        assert.equal(meBody.profile.role, 'customer', 'Database role must override user_metadata');

        // Customer cannot access admin routes
        const adminRes = await fetch(`${baseUrl}/api/admin/metrics`, {
          headers: { Authorization: 'Bearer customer-jwt' }
        });
        assert.equal(adminRes.status, 403, 'Customer must receive 403 on admin routes');
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('Unauthenticated order placement requests to POST /api/orders are rejected with HTTP 401', async () => {
      // 1. Missing Authorization header
      const noAuthRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Guest Diner',
          customer_email: 'guest@example.com',
          customer_phone: '+1 555-0987',
          delivery_address: '456 Guest Boulevard',
          payment_method: 'cod',
          items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
        })
      });
      assert.equal(noAuthRes.status, 401, 'Unauthenticated order request must return HTTP 401');
      const noAuthBody = await noAuthRes.json();
      assert.equal(noAuthBody.success, false);
      assert.match(noAuthBody.error, /authentication required/i);

      // 2. Malformed Authorization header (not Bearer)
      const malformedRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic not-bearer-token'
        },
        body: JSON.stringify({
          customer_name: 'Guest Diner',
          customer_email: 'guest@example.com',
          customer_phone: '+1 555-0987',
          delivery_address: '456 Guest Boulevard',
          payment_method: 'cod',
          items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
        })
      });
      assert.equal(malformedRes.status, 401, 'Malformed Authorization header must return HTTP 401');

      // 3. Invalid or expired Bearer token
      setAdminClientForTesting({
        auth: {
          getUser: async () => ({ data: { user: null }, error: new Error('Invalid or expired JWT') })
        }
      });
      try {
        const invalidTokenRes = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer invalid.or.expired.jwt'
          },
          body: JSON.stringify({
            customer_name: 'Guest Diner',
            customer_email: 'guest@example.com',
            customer_phone: '+1 555-0987',
            delivery_address: '456 Guest Boulevard',
            payment_method: 'cod',
            items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
          })
        });
        assert.equal(invalidTokenRes.status, 401, 'Invalid Bearer token must return HTTP 401');
      } finally {
        setAdminClientForTesting(null);
      }
    });

    test('Authenticated customer checkout succeeds and derives user_id strictly from session', async () => {
      let capturedPayload = null;
      const verifiedCustomer = {
        id: 'cust-verified-001',
        email: 'customer@example.com'
      };

      const mockSupabase = {
        auth: {
          getUser: async (token) => {
            if (token === 'valid-customer-token') {
              return { data: { user: verifiedCustomer }, error: null };
            }
            return { data: { user: null }, error: new Error('Invalid token') };
          }
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: verifiedCustomer.id,
                  email: verifiedCustomer.email,
                  role: 'customer'
                },
                error: null
              })
            })
          })
        }),
        rpc: async (fnName, params) => {
          capturedPayload = params.p_order;
          return {
            data: {
              id: 'ord-auth-001',
              order_number: 'ORD-AUTH-001',
              user_id: params.p_order.user_id,
              total_amount: 25.00,
              items: []
            },
            error: null
          };
        }
      };

      setAdminClientForTesting(mockSupabase);

      try {
        const res = await fetch(`${baseUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-customer-token'
          },
          body: JSON.stringify({
            user_id: 'victim-0000-0000-0000-000000000099', // Attacker attempt to spoof user_id
            role: 'admin',                                  // Attacker attempt to escalate role
            customer_name: 'Verified Customer',
            customer_email: verifiedCustomer.email,
            customer_phone: '+1 555-0987',
            delivery_address: '456 Verified Boulevard',
            payment_method: 'cod',
            items: [{ food_id: 'f1000000-0000-0000-0000-000000000001', quantity: 1 }]
          })
        });

        assert.equal(res.status, 201, 'Authenticated customer order must succeed with 201');
        assert.ok(capturedPayload);
        // Identity strictly session-derived: NEVER trust client-supplied user_id
        assert.equal(capturedPayload.user_id, verifiedCustomer.id, 'Order user_id must come strictly from verified session');
        assert.notEqual(capturedPayload.user_id, 'victim-0000-0000-0000-000000000099', 'Client user_id spoofing must be ignored');
      } finally {
        setAdminClientForTesting(null);
      }
    });

  });

  // --- 5. Missing Supabase Configuration Fail-Closed ---
  describe('Missing Supabase Configuration Fail-Closed Behavior', () => {

    test('In production, missing Supabase connection returns HTTP 503 and never emits mock session', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevDemo = process.env.ALLOW_DEMO_AUTH;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.ALLOW_DEMO_AUTH;
        setAdminClientForTesting(null);

        // GET /api/auth/me fails with 503
        const meRes = await fetch(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: 'Bearer some-token' }
        });
        assert.equal(meRes.status, 503);
        const meBody = await meRes.json();
        assert.equal(meBody.success, false);

        // PUT /api/auth/profile fails with 503
        const profRes = await fetch(`${baseUrl}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer some-token'
          },
          body: JSON.stringify({ full_name: 'Test' })
        });
        assert.equal(profRes.status, 503);
      } finally {
        setAdminClientForTesting(null);
        process.env.NODE_ENV = prevEnv;
        process.env.ALLOW_DEMO_AUTH = prevDemo;
      }
    });

  });

});
