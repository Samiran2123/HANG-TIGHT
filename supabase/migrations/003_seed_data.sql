-- ============================================================================
-- 003_seed_data.sql
-- Realistic Seed Data for Food Ordering Web Application
-- ============================================================================

-- Categories
INSERT INTO public.categories (id, name, slug, description, image_url, sort_order) VALUES
('c1000000-0000-0000-0000-000000000001', 'Artisanal Burgers', 'burgers', 'Gourmet smashed beef, crispy buttermilk chicken, and chef crafted brioche burgers.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', 1),
('c1000000-0000-0000-0000-000000000002', 'Neapolitan Pizzas', 'pizzas', '48-hour fermented sourdough crust baked with San Marzano tomatoes and fior di latte.', 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80', 2),
('c1000000-0000-0000-0000-000000000003', 'Asian Wok & Bowls', 'asian-bowls', 'Savory ramen noodles, fragrant teriyaki bowls, and spicy wok fried specialties.', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80', 3),
('c1000000-0000-0000-0000-000000000004', 'Healthy Bowls & Greens', 'healthy-greens', 'Superfood salads, organic grain bowls, fresh avocados, and citrus dressings.', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', 4),
('c1000000-0000-0000-0000-000000000005', 'Desserts & Bakes', 'desserts', 'Molten chocolate lava, Basque cheesecakes, and handcrafted sweet delights.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', 5),
('c1000000-0000-0000-0000-000000000006', 'Cold Pressed & Shakes', 'beverages', 'Fresh fruit smoothies, artisanal shakes, cold brew, and refreshing sodas.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', 6)
ON CONFLICT (id) DO NOTHING;

-- Foods
INSERT INTO public.foods (id, category_id, name, description, price, image_url, is_available, preparation_time, calories, rating, tags) VALUES
-- Burgers
('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Truffle Umami Double Smash', 'Double Angus beef patty smashed crispy with black truffle aioli, aged cheddar, caramelised balsamic onions on toasted brioche.', 15.99, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', true, 18, 790, 4.9, ARRAY['Chef Special', 'Bestseller', 'Angus Beef']),
('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Crispy Nashville Hot Chicken', 'Buttermilk soaked fried chicken breast tossed in spicy cayenne maple glaze, crunchy cabbage slaw, and dill pickles.', 13.99, 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80', true, 15, 680, 4.8, ARRAY['Spicy', 'Crispy', 'Popular']),
('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'Smoky BBQ Bacon Cheddar', 'Grilled beef patty with applewood smoked bacon, crispy onion rings, house bourbon BBQ sauce, and Monterey Jack cheese.', 14.50, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80', true, 20, 850, 4.7, ARRAY['Smoky', 'Hearty']),

-- Pizzas
('f1000000-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000002', 'Margherita di Bufala D.O.P.', 'San Marzano tomato base, fresh buffalo mozzarella, fragrant Genovese basil leaves, and extra virgin cold-pressed olive oil.', 14.99, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80', true, 15, 620, 4.9, ARRAY['Vegetarian', 'Classic', 'Sourdough']),
('f1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'Spicy Calabrese Pepperoni & Honey', 'Wood-fired crust, slow-cured spicy pork pepperoni, crushed chili flakes, and hot wildflower honey drizzle.', 17.50, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', true, 18, 760, 4.9, ARRAY['Spicy', 'Bestseller']),
('f1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000002', 'Wild Forest Truffle Mushroom', 'Creamy garlic ricotta base, roasted cremini, shiitake, and oyster mushrooms, thyme, shaved pecorino, white truffle oil.', 18.00, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', true, 20, 710, 4.8, ARRAY['Vegetarian', 'Gourmet']),

-- Asian Bowls
('f1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000003', 'Tokyo Shoyu Tonkotsu Ramen', 'Rich 16-hour pork bone broth, springy handcrafted noodles, braised chashu pork belly, ajitsuke tamago egg, nori and scallions.', 16.50, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80', true, 22, 650, 4.9, ARRAY['Authentic', 'Bestseller', 'Hot Broth']),
('f1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000003', 'Glazed Salmon Teriyaki Rice Bowl', 'Pan-seared Atlantic salmon fillet glazed in house mirin teriyaki, steamed sushi rice, edamame, pickled ginger, and toasted sesame.', 18.50, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', true, 20, 580, 4.8, ARRAY['High Protein', 'Omega 3', 'Healthy Choice']),
('f1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000003', 'Wok-Fired Pad Thai with Prawns', 'Rice noodles flash fried in tamarind reduction, wild tiger prawns, bean sprouts, crushed peanuts, egg, and fresh lime wedge.', 15.75, 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80', true, 16, 590, 4.7, ARRAY['Gluten-Free Option', 'Seafood']),

-- Healthy Greens
('f1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000004', 'Mediterranean Grilled Chicken & Quinoa', 'Herb-marinated chicken breast, warm tri-color quinoa, Persian cucumbers, Kalamata olives, sheep milk feta, and lemon tahini.', 13.50, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80', true, 15, 450, 4.8, ARRAY['Clean Eating', 'Keto Friendly']),
('f1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000004', 'Superfood Green Goddess Salad', 'Baby spinach, Tuscan kale, ripe Hass avocado, shaved radish, toasted pumpkin seeds, crisp green apple, and herb vinaigrette.', 12.00, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', true, 12, 380, 4.7, ARRAY['Vegan', 'Organic', 'Low Calorie']),

-- Desserts
('f1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000005', 'Molten Belgian Dark Chocolate Cake', 'Warm 70% dark Valrhona chocolate cake with molten center, accompanied by Madagascar vanilla bean gelato.', 8.99, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80', true, 12, 520, 4.9, ARRAY['Decadent', 'Hot & Cold']),
('f1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000005', 'Caramelized Basque Burnt Cheesecake', 'Silky, creamy center with a deeply caramelized exterior, served with macerated wild summer berries.', 8.50, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80', true, 10, 460, 4.9, ARRAY['Artisanal', 'Bestseller']),

-- Beverages
('f1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000006', 'Cold Pressed Dragonfruit & Passion Elixir', 'Fresh red dragonfruit, passion fruit pulp, organic mint leaves, and lime juice over crushed crystal ice.', 6.50, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80', true, 5, 140, 4.8, ARRAY['Refreshing', 'No Added Sugar']),
('f1000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000006', 'Salted Caramel Hazelnut Milkshake', 'Creamy Madagascar vanilla shake blended with Himalayan pink salt, house caramel, and roasted crushed hazelnuts.', 7.25, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80', true, 6, 490, 4.8, ARRAY['Indulgent', 'Sweet Treat'])
ON CONFLICT (id) DO NOTHING;
