import type { Product, Order, Cart } from '~/types'

/**
 * Demo product catalog
 */
export const demoProducts: Product[] = [
  {
    id: 'p1',
    name: 'Laptop Pro',
    price: 999,
    category: 'electronics',
    stock: 15,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
    description:
      'High-performance laptop with 16GB RAM, 512GB SSD, and a stunning 15.6" Retina display. Perfect for professionals and power users.',
  },
  {
    id: 'p2',
    name: 'Wireless Headphones',
    price: 199,
    category: 'electronics',
    stock: 42,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    description:
      'Premium noise-cancelling wireless headphones with 30-hour battery life and crystal-clear audio quality.',
  },
  {
    id: 'p3',
    name: 'Mechanical Keyboard',
    price: 149,
    category: 'accessories',
    stock: 28,
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=300&fit=crop',
    description:
      'RGB mechanical gaming keyboard with Cherry MX switches, programmable keys, and aluminum frame construction.',
  },
  {
    id: 'p4',
    name: 'USB-C Hub',
    price: 79,
    category: 'accessories',
    stock: 56,
    image: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=300&fit=crop',
    description:
      '7-in-1 USB-C hub with HDMI 4K output, 3 USB-A ports, SD card reader, and 100W power delivery passthrough.',
  },
  {
    id: 'p5',
    name: '4K Monitor',
    price: 449,
    category: 'electronics',
    stock: 8,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
    description:
      '27-inch 4K UHD IPS monitor with 99% sRGB color accuracy, USB-C connectivity, and adjustable ergonomic stand.',
  },
]

/**
 * Demo orders history
 */
export const demoOrders: Order[] = [
  {
    id: 'ord-001',
    items: [
      { productId: 'p1', quantity: 1 },
      { productId: 'p4', quantity: 2 },
    ],
    total: 1157,
    status: 'delivered',
    createdAt: '2024-12-15T10:30:00Z',
  },
  {
    id: 'ord-002',
    items: [{ productId: 'p2', quantity: 1 }],
    total: 199,
    status: 'shipped',
    createdAt: '2024-12-20T14:45:00Z',
  },
]

/**
 * Demo cart state
 */
export const demoCart: Cart = {
  items: [
    { productId: 'p3', quantity: 1 },
    { productId: 'p5', quantity: 1 },
  ],
  updatedAt: new Date().toISOString(),
}

/**
 * Helper to get a product by ID
 */
export function getProductById(id: string): Product | undefined {
  return demoProducts.find((p) => p.id === id)
}

/**
 * Helper to filter products by category
 */
export function getProductsByCategory(category?: string): Product[] {
  if (!category || category === 'all') {
    return demoProducts
  }
  return demoProducts.filter((p) => p.category === category)
}

/**
 * Helper to search products
 */
export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase()
  return demoProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Calculate cart total
 */
export function calculateCartTotal(items: { productId: string; quantity: number }[]): number {
  return items.reduce((total, item) => {
    const product = getProductById(item.productId)
    return total + (product?.price ?? 0) * item.quantity
  }, 0)
}
