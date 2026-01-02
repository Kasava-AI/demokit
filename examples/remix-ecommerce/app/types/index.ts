/**
 * Product type for the e-commerce demo
 */
export interface Product {
  id: string
  name: string
  price: number
  category: 'electronics' | 'accessories'
  stock: number
  image: string
  description: string
}

/**
 * Cart item representing a product with quantity
 */
export interface CartItem {
  productId: string
  quantity: number
}

/**
 * Order type for completed purchases
 */
export interface Order {
  id: string
  items: CartItem[]
  total: number
  status: 'confirmed' | 'shipped' | 'delivered'
  createdAt: string
}

/**
 * Cart state for the application
 */
export interface Cart {
  items: CartItem[]
  updatedAt: string
}

/**
 * Product with resolved details for display
 */
export interface CartItemWithProduct extends CartItem {
  product: Product
}
