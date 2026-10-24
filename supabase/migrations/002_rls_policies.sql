-- ============================================================================
-- 002_rls_policies.sql
-- Production Row Level Security (RLS) Policies & Integrity Triggers
-- Safe to execute on projects where migration 001 has already succeeded.
--
-- DESIGN PRINCIPLE: Orders and order items are created exclusively by the
-- trusted backend (Express server) using the Supabase service-role key via
-- the atomic database procedure `public.create_order_atomic`.
-- Direct customer INSERT access is explicitly REVOKED at the SQL grant level
-- and absent from RLS policies. This completely eliminates financial-integrity
-- attacks (forged totals, line prices, tax, delivery fee, payment flags).
-- ============================================================================

-- 1. Enable RLS on all five operational tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 2. Retroactively harden migration 001 trigger functions with empty search_path
-- All referenced objects are schema-qualified. Trigger-only: no direct EXECUTE granted.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      pg_catalog.split_part(new.email, '@', 1)
    ),
    'customer' -- Enforce default 'customer' role; user metadata cannot override
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = pg_catalog.timezone('utc'::pg_catalog.text, pg_catalog.now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;

-- 3. Administrative verification helper function
-- Determines admin status for normal authenticated requests strictly from public.profiles.role.
-- Hardened with SET search_path = '', trusted owner (postgres), and explicit schema references.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER FUNCTION public.is_admin() OWNER TO postgres;

-- Least-privilege grants: anon does NOT need is_admin() access
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Clean up redundant transitional role helper if present from previous drafts
DROP FUNCTION IF EXISTS public.get_auth_role();

-- 4. Role Escalation Prevention: BEFORE UPDATE Trigger on public.profiles
CREATE OR REPLACE FUNCTION public.protect_profile_role_update()
RETURNS trigger AS $$
BEGIN
  -- If role is not being altered, permit immediately
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- 1. Direct administrative session in SQL Editor or psql
  IF session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- 2. Authenticated user who holds the 'admin' role in public.profiles
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 3. Explicit backend service-role API request
  IF (
    pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
    OR (
      pg_catalog.current_setting('request.jwt.claims', true) IS NOT NULL
      AND pg_catalog.current_setting('request.jwt.claims', true) <> ''
      AND (pg_catalog.current_setting('request.jwt.claims', true)::pg_catalog.jsonb ->> 'role') = 'service_role'
    )
  ) THEN
    RETURN NEW;
  END IF;

  -- Unauthorized attempt to alter role column
  RAISE EXCEPTION 'Access denied: Customer accounts cannot modify their assigned role.'
    USING ERRCODE = '42501'; -- insufficient_privilege
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

ALTER FUNCTION public.protect_profile_role_update() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.protect_profile_role_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS ensure_profile_role_integrity ON public.profiles;
CREATE TRIGGER ensure_profile_role_integrity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role_update();

-- 5. Order Item Integrity & Server-Authoritative Pricing Trigger
-- Defence-in-depth: even though customers have no INSERT policy and INSERT is revoked,
-- this trigger guards against any future misconfiguration or internal misuse.
CREATE OR REPLACE FUNCTION public.validate_order_item_integrity()
RETURNS trigger AS $$
DECLARE
  v_food public.foods%ROWTYPE;
BEGIN
  -- Service role and direct administrative sessions bypass automated re-pricing
  IF session_user IN ('postgres', 'supabase_admin')
     OR (pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role')
     OR (
       pg_catalog.current_setting('request.jwt.claims', true) IS NOT NULL
       AND pg_catalog.current_setting('request.jwt.claims', true) <> ''
       AND (pg_catalog.current_setting('request.jwt.claims', true)::pg_catalog.jsonb ->> 'role') = 'service_role'
     ) THEN
    RETURN NEW;
  END IF;

  -- Block customer updates on existing items
  IF TG_OP = 'UPDATE' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Submitted order items cannot be modified.'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Ensure valid food reference and quantity range
  IF NEW.food_id IS NULL THEN
    RAISE EXCEPTION 'Order item must reference a valid food item.'
      USING ERRCODE = '23502';
  END IF;

  IF NEW.quantity IS NULL OR NEW.quantity <= 0 OR NEW.quantity > 100 THEN
    RAISE EXCEPTION 'Order item quantity must be between 1 and 100.'
      USING ERRCODE = '22023';
  END IF;

  -- 2. Fetch authoritative food record
  SELECT * INTO v_food
  FROM public.foods
  WHERE id = NEW.food_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Food item with specified ID does not exist.'
      USING ERRCODE = '23503';
  END IF;

  IF NOT v_food.is_available THEN
    RAISE EXCEPTION 'Item "%" is currently unavailable or sold out.', v_food.name
      USING ERRCODE = '22023';
  END IF;

  -- 3. Authoritatively enforce database pricing (discard any untrusted client inputs)
  NEW.food_name := v_food.name;
  NEW.unit_price := v_food.price;
  NEW.subtotal := pg_catalog.round((v_food.price * NEW.quantity)::numeric, 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

ALTER FUNCTION public.validate_order_item_integrity() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.validate_order_item_integrity() FROM PUBLIC;

DROP TRIGGER IF EXISTS ensure_order_item_integrity ON public.order_items;
CREATE TRIGGER ensure_order_item_integrity
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_item_integrity();

-- 6. Atomic Order Creation Helper Function
-- Creates an order and its items in a single, atomic PostgreSQL transaction.
-- Authoritatively validates customer fields, food references, quantities, and pricing.
-- Request-derived financial and status values are never trusted.
-- Accessible exclusively by backend service_role.
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_order jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order_id uuid;
  v_user_id uuid;
  v_order_number text;
  v_payment_method text;
  v_payment_status text;
  v_order_record public.orders%ROWTYPE;
  v_item jsonb;
  v_food public.foods%ROWTYPE;
  v_unit_price numeric(10,2);
  v_quantity int;
  v_line_subtotal numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_tax numeric(10,2);
  v_delivery_fee numeric(10,2);
  v_total_amount numeric(10,2);
  v_items_result jsonb := '[]'::jsonb;
  v_item_record public.order_items%ROWTYPE;
BEGIN
  -- Strict caller authorization: only trusted service-role or database superusers
  IF NOT (
    session_user IN ('postgres', 'supabase_admin')
    OR pg_catalog.current_setting('request.jwt.claim.role', true) = 'service_role'
    OR (
      pg_catalog.current_setting('request.jwt.claims', true) IS NOT NULL
      AND pg_catalog.current_setting('request.jwt.claims', true) <> ''
      AND (pg_catalog.current_setting('request.jwt.claims', true)::pg_catalog.jsonb ->> 'role') = 'service_role'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Only trusted backend service-role or administrators can create orders.'
      USING ERRCODE = '42501';
  END IF;

  -- 1. Validate customer required fields
  IF p_order->>'customer_name' IS NULL OR pg_catalog.length(pg_catalog.btrim(p_order->>'customer_name')) < 2 THEN
    RAISE EXCEPTION 'Customer name must be at least 2 characters.' USING ERRCODE = '22023';
  END IF;

  IF p_order->>'customer_email' IS NULL OR pg_catalog.strpos(p_order->>'customer_email', '@') < 2 THEN
    RAISE EXCEPTION 'Valid customer email is required.' USING ERRCODE = '22023';
  END IF;

  IF p_order->>'customer_phone' IS NULL OR pg_catalog.length(pg_catalog.btrim(p_order->>'customer_phone')) < 3 THEN
    RAISE EXCEPTION 'Customer phone number is required.' USING ERRCODE = '22023';
  END IF;

  IF p_order->>'delivery_address' IS NULL OR pg_catalog.length(pg_catalog.btrim(p_order->>'delivery_address')) < 5 THEN
    RAISE EXCEPTION 'Valid delivery address must be at least 5 characters.' USING ERRCODE = '22023';
  END IF;

  -- 2. Validate user_id (preserve guest checkout; reject invalid format or non-existent user profile)
  IF p_order->>'user_id' IS NOT NULL AND pg_catalog.btrim(p_order->>'user_id') <> '' THEN
    BEGIN
      v_user_id := pg_catalog.btrim(p_order->>'user_id')::uuid;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Invalid user_id format "%". Must be a valid UUID.', p_order->>'user_id' USING ERRCODE = '22023';
    END;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
      RAISE EXCEPTION 'Referenced user profile % does not exist.', v_user_id USING ERRCODE = '23503';
    END IF;
  ELSE
    v_user_id := NULL;
  END IF;

  -- 3. Strict lifecycle and payment validations (prevent forged initial status)
  IF p_order->>'status' IS NOT NULL AND p_order->>'status' <> 'pending' THEN
    RAISE EXCEPTION 'New orders must be created with status "pending", got: "%".', p_order->>'status' USING ERRCODE = '22023';
  END IF;

  v_payment_method := COALESCE(NULLIF(pg_catalog.btrim(p_order->>'payment_method'), ''), 'cod');
  IF v_payment_method NOT IN ('cod', 'card_demo', 'upi_demo') THEN
    RAISE EXCEPTION 'Invalid payment method "%". Permitted methods are "cod", "card_demo", or "upi_demo".', v_payment_method USING ERRCODE = '22023';
  END IF;

  IF p_order->>'payment_status' IS NOT NULL THEN
    IF v_payment_method = 'cod' AND p_order->>'payment_status' <> 'pending' THEN
      RAISE EXCEPTION 'Initial payment_status for COD orders must be "pending", got: "%".', p_order->>'payment_status' USING ERRCODE = '22023';
    ELSIF v_payment_method IN ('card_demo', 'upi_demo') AND p_order->>'payment_status' NOT IN ('pending', 'demo_paid') THEN
      RAISE EXCEPTION 'Invalid or forged initial payment_status "%" for demo payment.', p_order->>'payment_status' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_order->>'sheets_synced' IS NOT NULL AND pg_catalog.lower(pg_catalog.btrim(p_order->>'sheets_synced')) = 'true' THEN
    RAISE EXCEPTION 'Initial orders cannot be pre-marked as sheets_synced.' USING ERRCODE = '22023';
  END IF;

  -- Authoritatively assign initial statuses based on validated method
  v_payment_status := CASE WHEN v_payment_method = 'cod' THEN 'pending' ELSE 'demo_paid' END;

  -- 4. Validate order items
  IF p_items IS NULL OR pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.' USING ERRCODE = '22023';
  END IF;

  v_order_id := COALESCE((p_order->>'id')::uuid, pg_catalog.gen_random_uuid());

  -- 5. Calculate totals authoritatively from trusted foods table
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_food FROM public.foods WHERE id = (v_item->>'food_id')::uuid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Food item with specified ID does not exist.' USING ERRCODE = '23503';
    END IF;

    IF NOT v_food.is_available THEN
      RAISE EXCEPTION 'Item "%" is currently unavailable or sold out.', v_food.name USING ERRCODE = '22023';
    END IF;

    v_quantity := (v_item->>'quantity')::int;
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > 100 THEN
      RAISE EXCEPTION 'Order item quantity must be between 1 and 100.' USING ERRCODE = '22023';
    END IF;

    v_unit_price := v_food.price;
    v_line_subtotal := pg_catalog.round((v_unit_price * v_quantity)::numeric, 2);
    v_subtotal := v_subtotal + v_line_subtotal;
  END LOOP;

  v_tax := pg_catalog.round((v_subtotal * 0.0825)::numeric, 2);
  v_delivery_fee := CASE WHEN v_subtotal > 50.00 THEN 0.00 ELSE 4.99 END;
  v_total_amount := v_subtotal + v_tax + v_delivery_fee;

  -- 6. Insert parent order with authoritative financial and state values
  v_order_number := COALESCE(
    NULLIF(pg_catalog.btrim(p_order->>'order_number'), ''),
    'ORD-' || pg_catalog.to_char(pg_catalog.now(), 'YYYYMMDD') || '-' || pg_catalog.floor(1000 + pg_catalog.random() * 9000)::text
  );

  INSERT INTO public.orders (
    id, order_number, user_id, customer_name, customer_email, customer_phone,
    delivery_address, delivery_notes, status, subtotal, tax, delivery_fee,
    total_amount, payment_status, payment_method, sheets_synced
  ) VALUES (
    v_order_id,
    v_order_number,
    v_user_id,
    pg_catalog.btrim(p_order->>'customer_name'),
    pg_catalog.lower(pg_catalog.btrim(p_order->>'customer_email')),
    pg_catalog.btrim(p_order->>'customer_phone'),
    pg_catalog.btrim(p_order->>'delivery_address'),
    NULLIF(pg_catalog.btrim(p_order->>'delivery_notes'), ''),
    'pending',
    v_subtotal,
    v_tax,
    v_delivery_fee,
    v_total_amount,
    v_payment_status,
    v_payment_method,
    false
  ) RETURNING * INTO v_order_record;

  -- 7. Insert order items and accumulate in result array
  FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_food FROM public.foods WHERE id = (v_item->>'food_id')::uuid;
    v_quantity := (v_item->>'quantity')::int;
    v_unit_price := v_food.price;
    v_line_subtotal := pg_catalog.round((v_unit_price * v_quantity)::numeric, 2);

    INSERT INTO public.order_items (
      order_id, food_id, food_name, unit_price, quantity, subtotal
    ) VALUES (
      v_order_id, v_food.id, v_food.name, v_unit_price, v_quantity, v_line_subtotal
    ) RETURNING * INTO v_item_record;

    v_items_result := v_items_result || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_item_record));
  END LOOP;

  RETURN pg_catalog.to_jsonb(v_order_record) || pg_catalog.jsonb_build_object('items', v_items_result);
END;
$$;

ALTER FUNCTION public.create_order_atomic(jsonb, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_order_atomic(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_order_atomic(jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.create_order_atomic(jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(jsonb, jsonb) TO service_role;

-- ============================================================================
-- 7. EXPLICIT POSTGRESQL TABLE GRANTS
-- Set explicit, least-privilege table grants across all five operational tables.
-- Anon users can browse categories and foods, but have no access to orders or profiles.
-- Authenticated customers can read their own profiles/orders, but cannot INSERT directly
-- into orders or order_items (all order creation is service-role only).
-- ============================================================================

-- PROFILES:
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- CATEGORIES:
REVOKE ALL ON public.categories FROM anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;

-- FOODS:
REVOKE ALL ON public.foods FROM anon;
GRANT SELECT ON public.foods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foods TO authenticated;

-- ORDERS:
REVOKE ALL ON public.orders FROM anon;
REVOKE INSERT ON public.orders FROM authenticated;
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;

-- ORDER_ITEMS:
REVOKE ALL ON public.order_items FROM anon;
REVOKE INSERT ON public.order_items FROM authenticated;
GRANT SELECT, UPDATE, DELETE ON public.order_items TO authenticated;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------

-- Users can read their own profile; Admins can read all profiles
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- Users can update only their own profile details.
-- Role immutability for non-admins is independently enforced by the BEFORE UPDATE trigger.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- Admins can insert profiles directly if needed
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can delete profiles if needed
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- CATEGORIES POLICIES
-- ----------------------------------------------------------------------------

-- Public and authenticated users can view categories (no is_admin call required)
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

-- Only admins can mutate categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- FOODS POLICIES
-- ----------------------------------------------------------------------------

-- Anyone (including anon) can view available foods without calling is_admin()
DROP POLICY IF EXISTS "Anyone can view available foods" ON public.foods;
CREATE POLICY "Anyone can view available foods"
  ON public.foods FOR SELECT
  USING (is_available = true);

-- Admins can view all foods (including sold out / unavailable items)
DROP POLICY IF EXISTS "Admins can view all foods" ON public.foods;
CREATE POLICY "Admins can view all foods"
  ON public.foods FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Only admins can insert, update, or delete foods
DROP POLICY IF EXISTS "Admins can manage foods" ON public.foods;
CREATE POLICY "Admins can manage foods"
  ON public.foods FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- ORDERS POLICIES
-- Customers can only SELECT their own orders.
-- Direct customer INSERT is REVOKED and has NO policy.
-- The backend service_role (BYPASSRLS) creates orders.
-- Admins can view, update, and delete orders.
-- ----------------------------------------------------------------------------

-- Customers can view only their own orders; Admins can view all orders
DROP POLICY IF EXISTS "Users can view own orders or admin views all" ON public.orders;
CREATE POLICY "Users can view own orders or admin views all"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Remove any leftover customer INSERT policies from previous drafts
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;

-- Only Admins can update orders through the authenticated PostgREST path.
-- (Backend service_role bypasses RLS entirely and does not need a policy.)
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can delete orders if needed
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- ORDER ITEMS POLICIES
-- Customers can only SELECT their own order items.
-- Direct customer INSERT is REVOKED and has NO policy.
-- The backend service_role (BYPASSRLS) creates order items.
-- Admins can manage order items.
-- ----------------------------------------------------------------------------

-- Users can view order items for their own orders; Admins can view all
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Remove any leftover customer INSERT policies from previous drafts
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;

-- Admins can manage order items (insert / update / delete) if needed
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
