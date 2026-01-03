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
 * Shopping cart state
 */
export interface Cart {
  items: CartItem[]
  total: number
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
 * Checkout form data
 */
export interface CheckoutData {
  address_id: string
  payment_method_id: string
}

/**
 * Products API response
 */
export interface ProductsResponse {
  products: Product[]
  categories: string[]
}

/**
 * Product detail API response
 */
export interface ProductDetailResponse {
  product: Product
  relatedProducts: Product[]
}

/**
 * Cart API response
 */
export interface CartResponse {
  cart: Cart
  products: Product[]
}

/**
 * Orders API response
 */
export interface OrdersResponse {
  orders: Order[]
}

/**
 * Order detail API response
 */
export interface OrderDetailResponse {
  order: Order
  products: Product[]
}

/**
 * Cart mutation response
 */
export interface CartMutationResponse {
  success: boolean
  message?: string
  cart?: Cart
}

/**
 * Checkout mutation response
 */
export interface CheckoutMutationResponse {
  success: boolean
  orderId?: string
  error?: string
}
