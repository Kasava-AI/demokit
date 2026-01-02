/**
 * Product in the e-commerce store
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
 * Item in the shopping cart
 */
export interface CartItem {
  productId: string
  quantity: number
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
 * Order placed by a customer
 */
export interface Order {
  id: string
  items: CartItem[]
  total: number
  status: 'confirmed' | 'shipped' | 'delivered'
  createdAt: string
}

/**
 * Checkout form data
 */
export interface CheckoutData {
  email: string
  name: string
  address: string
  city: string
  zipCode: string
  cardNumber: string
}

/**
 * Add to cart mutation variables
 */
export interface AddToCartVariables {
  productId: string
  quantity: number
}

/**
 * Update cart item mutation variables
 */
export interface UpdateCartItemVariables {
  productId: string
  quantity: number
}

/**
 * Remove from cart mutation variables
 */
export interface RemoveFromCartVariables {
  productId: string
}

/**
 * Checkout mutation variables
 */
export interface CheckoutVariables {
  email: string
  name: string
  address: string
  city: string
  zipCode: string
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
