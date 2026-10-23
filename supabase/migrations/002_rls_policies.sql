-- ============================================================================
-- 002_rls_policies.sql
-- Production Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all operational tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Helper function to verify if the requesting user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------

-- Users can read their own profile; Admins can read all profiles
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins view all"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- Users can update only their own profile details (role changes are blocked via column check or trigger)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent customers from escalating themselves to admin
    (role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR public.is_admin())
  );

-- ----------------------------------------------------------------------------
-- CATEGORIES POLICIES
-- ----------------------------------------------------------------------------

-- Everyone (authenticated & anonymous) can view categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

-- Only admins can mutate categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- FOODS POLICIES
-- ----------------------------------------------------------------------------

-- Customers can view available foods; Admins can view all foods
DROP POLICY IF EXISTS "Anyone can view available foods" ON public.foods;
CREATE POLICY "Anyone can view available foods"
  ON public.foods FOR SELECT
  USING (is_available = true OR public.is_admin());

-- Only admins can insert, update, or delete foods
DROP POLICY IF EXISTS "Admins can manage foods" ON public.foods;
CREATE POLICY "Admins can manage foods"
  ON public.foods FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- ORDERS POLICIES
-- ----------------------------------------------------------------------------

-- Customers can view only their own orders; Admins can view all orders
DROP POLICY IF EXISTS "Users can view own orders or admin views all" ON public.orders;
CREATE POLICY "Users can view own orders or admin views all"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Authenticated customers can insert their own orders
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only Admins (or backend service role) can update orders (e.g. status changes)
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- ORDER ITEMS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view order items for their own orders; Admins can view all
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR public.is_admin())
    )
  );

-- Users can insert order items when creating their own orders
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
CREATE POLICY "Users can insert own order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
