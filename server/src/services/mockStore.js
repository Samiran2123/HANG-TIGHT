// In-memory persistent data store fallback for automated testing and offline evaluation

export const mockCategories = [
  { id: 'c1000000-0000-0000-0000-000000000001', name: 'Artisanal Burgers', slug: 'burgers', description: 'Gourmet smashed beef, crispy buttermilk chicken, and chef crafted brioche burgers.', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', sort_order: 1 },
  { id: 'c1000000-0000-0000-0000-000000000002', name: 'Neapolitan Pizzas', slug: 'pizzas', description: '48-hour fermented sourdough crust baked with San Marzano tomatoes and fior di latte.', image_url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80', sort_order: 2 },
  { id: 'c1000000-0000-0000-0000-000000000003', name: 'Asian Wok & Bowls', slug: 'asian-bowls', description: 'Savory ramen noodles, fragrant teriyaki bowls, and spicy wok fried specialties.', image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80', sort_order: 3 },
  { id: 'c1000000-0000-0000-0000-000000000004', name: 'Healthy Bowls & Greens', slug: 'healthy-greens', description: 'Superfood salads, organic grain bowls, fresh avocados, and citrus dressings.', image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', sort_order: 4 },
  { id: 'c1000000-0000-0000-0000-000000000005', name: 'Desserts & Bakes', slug: 'desserts', description: 'Molten chocolate lava, Basque cheesecakes, and handcrafted sweet delights.', image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80', sort_order: 5 },
  { id: 'c1000000-0000-0000-0000-000000000006', name: 'Cold Pressed & Shakes', slug: 'beverages', description: 'Fresh fruit smoothies, artisanal shakes, cold brew, and refreshing sodas.', image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80', sort_order: 6 }
];

export const mockFoods = [
  {
    id: 'f1000000-0000-0000-0000-000000000001',
    category_id: 'c1000000-0000-0000-0000-000000000001',
    category_name: 'Artisanal Burgers',
    name: 'Truffle Umami Double Smash',
    description: 'Double Angus beef patty smashed crispy with black truffle aioli, aged cheddar, caramelised balsamic onions on toasted brioche.',
    price: 15.99,
    image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 18,
    calories: 790,
    rating: 4.9,
    tags: ['Chef Special', 'Bestseller', 'Angus Beef']
  },
  {
    id: 'f1000000-0000-0000-0000-000000000002',
    category_id: 'c1000000-0000-0000-0000-000000000001',
    category_name: 'Artisanal Burgers',
    name: 'Crispy Nashville Hot Chicken',
    description: 'Buttermilk soaked fried chicken breast tossed in spicy cayenne maple glaze, crunchy cabbage slaw, and dill pickles.',
    price: 13.99,
    image_url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 15,
    calories: 680,
    rating: 4.8,
    tags: ['Spicy', 'Crispy', 'Popular']
  },
  {
    id: 'f1000000-0000-0000-0000-000000000003',
    category_id: 'c1000000-0000-0000-0000-000000000001',
    category_name: 'Artisanal Burgers',
    name: 'Smoky BBQ Bacon Cheddar',
    description: 'Grilled beef patty with applewood smoked bacon, crispy onion rings, house bourbon BBQ sauce, and Monterey Jack cheese.',
    price: 14.50,
    image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 20,
    calories: 850,
    rating: 4.7,
    tags: ['Smoky', 'Hearty']
  },
  {
    id: 'f1000000-0000-0000-0000-000000000004',
    category_id: 'c1000000-0000-0000-0000-000000000002',
    category_name: 'Neapolitan Pizzas',
    name: 'Margherita di Bufala D.O.P.',
    description: 'San Marzano tomato base, fresh buffalo mozzarella, fragrant Genovese basil leaves, and extra virgin cold-pressed olive oil.',
    price: 14.99,
    image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 15,
    calories: 620,
    rating: 4.9,
    tags: ['Vegetarian', 'Classic', 'Sourdough']
  },
  {
    id: 'f1000000-0000-0000-0000-000000000005',
    category_id: 'c1000000-0000-0000-0000-000000000002',
    category_name: 'Neapolitan Pizzas',
    name: 'Spicy Calabrese Pepperoni & Honey',
    description: 'Wood-fired crust, slow-cured spicy pork pepperoni, crushed chili flakes, and hot wildflower honey drizzle.',
    price: 17.50,
    image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 18,
    calories: 760,
    rating: 4.9,
    tags: ['Spicy', 'Bestseller']
  },
  {
    id: 'f1000000-0000-0000-0000-000000000006',
    category_id: 'c1000000-0000-0000-0000-000000000003',
    category_name: 'Asian Wok & Bowls',
    name: 'Tokyo Shoyu Tonkotsu Ramen',
    description: 'Rich 16-hour pork bone broth, springy handcrafted noodles, braised chashu pork belly, ajitsuke tamago egg, nori and scallions.',
    price: 16.50,
    image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 22,
    calories: 650,
    rating: 4.9,
    tags: ['Authentic', 'Bestseller', 'Hot Broth']
  },
  {
    id: 'f1000000-0000-0000-0000-000000000007',
    category_id: 'c1000000-0000-0000-0000-000000000003',
    category_name: 'Asian Wok & Bowls',
    name: 'Glazed Salmon Teriyaki Rice Bowl',
    description: 'Pan-seared Atlantic salmon fillet glazed in house mirin teriyaki, steamed sushi rice, edamame, pickled ginger, and toasted sesame.',
    price: 18.50,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 20,
    calories: 580,
    rating: 4.8,
    tags: ['High Protein', 'Omega 3', 'Healthy Choice']
  },
  {
    id: 'f1000000-0000-0000-0000-000000000008',
    category_id: 'c1000000-0000-0000-0000-000000000004',
    category_name: 'Healthy Bowls & Greens',
    name: 'Mediterranean Grilled Chicken & Quinoa',
    description: 'Herb-marinated chicken breast, warm tri-color quinoa, Persian cucumbers, Kalamata olives, sheep milk feta, and lemon tahini.',
    price: 13.50,
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 15,
    calories: 450,
    rating: 4.8,
    tags: ['Clean Eating', 'Keto Friendly']
  },
  {
    id: 'f1000000-0000-0000-0000-000000000009',
    category_id: 'c1000000-0000-0000-0000-000000000005',
    category_name: 'Desserts & Bakes',
    name: 'Molten Belgian Dark Chocolate Cake',
    description: 'Warm 70% dark Valrhona chocolate cake with molten center, accompanied by Madagascar vanilla bean gelato.',
    price: 8.99,
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 12,
    calories: 520,
    rating: 4.9,
    tags: ['Decadent', 'Hot & Cold']
  },
  {
    id: 'f1000000-0000-0000-0000-000000000010',
    category_id: 'c1000000-0000-0000-0000-000000000006',
    category_name: 'Cold Pressed & Shakes',
    name: 'Salted Caramel Hazelnut Milkshake',
    description: 'Creamy Madagascar vanilla shake blended with Himalayan pink salt, house caramel, and roasted crushed hazelnuts.',
    price: 7.25,
    image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
    is_available: true,
    preparation_time: 6,
    calories: 490,
    rating: 4.8,
    tags: ['Indulgent', 'Sweet Treat']
  }
];

export const mockOrders = [
  {
    id: 'ord-mock-001',
    order_number: 'ORD-20261023-1001',
    user_id: '00000000-0000-0000-0000-000000000001',
    customer_name: 'Demo Gourmet Customer',
    customer_email: 'demo.customer@foodpro.app',
    customer_phone: '+1 (555) 234-5678',
    delivery_address: '742 Evergreen Terrace, Springfield',
    delivery_notes: 'Leave at front door, ring bell',
    status: 'preparing',
    subtotal: 30.98,
    tax: 2.56,
    delivery_fee: 4.99,
    total_amount: 38.53,
    payment_status: 'demo_paid',
    payment_method: 'card_demo',
    sheets_synced: true,
    sheets_synced_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    items: [
      {
        id: 'item-001-1',
        order_id: 'ord-mock-001',
        food_id: 'f1000000-0000-0000-0000-000000000001',
        food_name: 'Truffle Umami Double Smash',
        unit_price: 15.99,
        quantity: 1,
        subtotal: 15.99
      },
      {
        id: 'item-001-2',
        order_id: 'ord-mock-001',
        food_id: 'f1000000-0000-0000-0000-000000000004',
        food_name: 'Margherita di Bufala D.O.P.',
        unit_price: 14.99,
        quantity: 1,
        subtotal: 14.99
      }
    ]
  },
  {
    id: 'ord-mock-002',
    order_number: 'ORD-20261023-1002',
    user_id: '00000000-0000-0000-0000-000000000001',
    customer_name: 'Demo Gourmet Customer',
    customer_email: 'demo.customer@foodpro.app',
    customer_phone: '+1 (555) 234-5678',
    delivery_address: '742 Evergreen Terrace, Springfield',
    delivery_notes: 'Call on arrival',
    status: 'delivered',
    subtotal: 25.49,
    tax: 2.10,
    delivery_fee: 4.99,
    total_amount: 32.58,
    payment_status: 'paid',
    payment_method: 'cod',
    sheets_synced: true,
    sheets_synced_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 82800000).toISOString(),
    items: [
      {
        id: 'item-002-1',
        order_id: 'ord-mock-002',
        food_id: 'f1000000-0000-0000-0000-000000000006',
        food_name: 'Tokyo Shoyu Tonkotsu Ramen',
        unit_price: 16.50,
        quantity: 1,
        subtotal: 16.50
      },
      {
        id: 'item-002-2',
        order_id: 'ord-mock-002',
        food_id: 'f1000000-0000-0000-0000-000000000009',
        food_name: 'Molten Belgian Dark Chocolate Cake',
        unit_price: 8.99,
        quantity: 1,
        subtotal: 8.99
      }
    ]
  }
];

export const mockProfiles = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'demo.customer@foodpro.app',
    full_name: 'Demo Gourmet Customer',
    phone: '+1 (555) 234-5678',
    role: 'customer',
    address: '742 Evergreen Terrace, Springfield',
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'admin@foodpro.app',
    full_name: 'Executive Chef Admin',
    phone: '+1 (555) 888-9999',
    role: 'admin',
    address: 'Culinary HQ, Suite 100',
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];
