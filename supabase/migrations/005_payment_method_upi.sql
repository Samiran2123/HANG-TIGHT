-- ============================================================================
-- 005_payment_method_upi.sql
-- Allow upi_demo in public.create_order_atomic procedure
-- ============================================================================

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

  -- Allow cod, card_demo, and upi_demo
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
