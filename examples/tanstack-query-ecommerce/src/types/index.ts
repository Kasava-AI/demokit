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
 * Shopping cart state with items and product details
 */
export interface Cart {
  items: CartItem[]
  total: number
}

/**
 * Cart item with resolved product data
 */
export interface CartItemWithProduct extends CartItem {
  product: Product
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
 * Add to cart mutation variables
 */
export interface AddToCartVariables {
  product_id: string
  quantity: number
}

/**
 * Update cart item mutation variables
 */
export interface UpdateCartItemVariables {
  product_id: string
  quantity: number
}

/**
 * Remove from cart mutation variables
 */
export interface RemoveFromCartVariables {
  product_id: string
}

/**
 * Checkout mutation variables
 */
export interface CheckoutVariables {
  address_id: string
  payment_method_id: string
}

/**
 * Cart mutation response
 */
export interface CartMutationResponse {
  success: boolean
  message?: string
  cart: Cart
}

/**
 * Checkout mutation response
 */
export interface CheckoutResponse {
  success: boolean
  orderId?: string
  error?: string
}
