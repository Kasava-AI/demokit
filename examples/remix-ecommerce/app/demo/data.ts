/**
 * Demo data for Remix e-commerce example
 */

import type { Product, CartItem, Cart, Order } from '~/types'

// Demo product data
export const demoProducts: Product[] = [
  {
    id: 'b413498c-f14c-4c03-aac0-dfc25ed4311f',
    name: 'MacBook Pro 14-inch M3',
    price: 1999.99,
    stock: 15,
    category: 'electronics',
    image_url: 'https://example.com/images/macbook-pro-14.jpg',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    description: 'Apple MacBook Pro 14-inch with M3 chip, 8GB RAM, 512GB SSD. Perfect for professional work and creative projects.',
  },
  {
    id: '73a15e65-66d6-4e42-81d0-09578390e2ad',
    name: 'Dell XPS 13 Plus',
    price: 1299.99,
    stock: 22,
    category: 'electronics',
    image_url: 'https://example.com/images/dell-xps-13.jpg',
    created_at: '2024-01-10T14:30:00Z',
    updated_at: '2024-01-10T14:30:00Z',
    description: 'Dell XPS 13 Plus with Intel Core i7, 16GB RAM, 1TB SSD. Ultra-portable design with stunning display.',
  },
  {
    id: 'e8b2f4ba-897b-43b0-af33-0552b3c3d344',
    name: 'Wireless Bluetooth Headphones',
    price: 199.99,
    stock: 45,
    category: 'electronics',
    image_url: 'https://example.com/images/bluetooth-headphones.jpg',
    created_at: '2024-01-08T09:15:00Z',
    updated_at: '2024-01-08T09:15:00Z',
    description: 'Premium wireless headphones with active noise cancellation and 30-hour battery life.',
  },
  {
    id: '2ee21613-ee15-4b2e-a4b5-ad66a67a39fa',
    name: 'USB-C Hub 7-in-1',
    price: 49.99,
    stock: 78,
    category: 'accessories',
    image_url: 'https://example.com/images/usb-c-hub.jpg',
    created_at: '2024-01-05T16:45:00Z',
    updated_at: '2024-01-05T16:45:00Z',
    description: 'Versatile USB-C hub with HDMI, USB 3.0 ports, SD card reader, and power delivery support.',
  },
  {
    id: 'fee88cc9-166f-4b32-9c65-2b91c39fadb7',
    name: 'Portable Phone Stand',
    price: 24.99,
    stock: 120,
    category: 'accessories',
    image_url: 'https://example.com/images/phone-stand.jpg',
    created_at: '2024-01-03T11:20:00Z',
    updated_at: '2024-01-03T11:20:00Z',
    description: 'Adjustable aluminum phone stand compatible with all smartphone sizes. Perfect for video calls and media viewing.',
  },
]

// Demo cart state
export const demoCart: Cart = {
  items: [
    { product_id: 'b413498c-f14c-4c03-aac0-dfc25ed4311f', quantity: 1 },
    { product_id: 'e8b2f4ba-897b-43b0-af33-0552b3c3d344', quantity: 2 },
  ],
  total: 2399.97,
}

// Demo orders
export const demoOrders: Order[] = [
  {
    id: '2ca33c06-d39c-4cce-b228-96e4635b7aff',
    items: [
      { quantity: 1, product_id: 'b413498c-f14c-4c03-aac0-dfc25ed4311f' },
      { quantity: 1, product_id: '2ee21613-ee15-4b2e-a4b5-ad66a67a39fa' },
    ],
    status: 'delivered',
    created_at: '2024-01-20T14:30:00Z',
    total_amount: 2049.98,
  },
  {
    id: 'ed75c354-5bd9-4601-bbd5-3b9641369c34',
    items: [
      { quantity: 2, product_id: 'e8b2f4ba-897b-43b0-af33-0552b3c3d344' },
    ],
    status: 'shipped',
    created_at: '2024-01-22T09:15:00Z',
    total_amount: 399.98,
  },
  {
    id: 'be80b1a3-2e20-468f-8122-de63c5c2e7ab',
    items: [
      { quantity: 1, product_id: '73a15e65-66d6-4e42-81d0-09578390e2ad' },
      { quantity: 2, product_id: 'fee88cc9-166f-4b32-9c65-2b91c39fadb7' },
    ],
    status: 'confirmed',
    created_at: '2024-01-25T16:45:00Z',
    total_amount: 1349.97,
  },
]

/**
 * Get product by ID
 */
export function getProductById(id: string): Product | undefined {
  return demoProducts.find((p) => p.id === id)
}

/**
 * Get products by category
 */
export function getProductsByCategory(category: string): Product[] {
  return demoProducts.filter((p) => p.category.toLowerCase() === category.toLowerCase())
}

/**
 * Search products by name or description
 */
export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase()
  return demoProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description?.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Calculate cart total
 */
export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const product = getProductById(item.product_id)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
}
