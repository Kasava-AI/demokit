/**
 * Product in the e-commerce store
 * Based on OpenAPI spec: E-commerce API v1.0.0
 */
export interface Product {
  id: string // UUID format
  name: string
  description?: string
  price: number // float
  category: string
  image_url?: string // URI format
  stock: number
  created_at?: string // date-time
  updated_at?: string // date-time
}

/**
 * Item in the shopping cart
 */
export interface CartItem {
  product_id: string // UUID format
  quantity: number // minimum 1
}

/**
 * Shipping/billing address
 */
export interface Address {
  id?: string // UUID format for saved addresses
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

/**
 * Order placed by a customer
 */
export interface Order {
  id: string // UUID format
  items: CartItem[]
  total_amount: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
  created_at: string // date-time
}

/**
 * Shopping cart state
 */
export interface Cart {
  items: CartItem[]
  total: number
}

/**
 * User registration data
 */
export interface RegisterData {
  email: string
  password: string
  name?: string
}

/**
 * User login credentials
 */
export interface LoginData {
  email: string
  password: string
}

/**
 * Authentication response
 */
export interface AuthResponse {
  token: string
  user: {
    id: string
    email: string
    name?: string
  }
}

/**
 * Checkout request data
 */
export interface CheckoutData {
  address_id: string
  payment_method_id: string
}

/**
 * Payment method
 */
export interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'bank'
  last_four?: string
  brand?: string
}
