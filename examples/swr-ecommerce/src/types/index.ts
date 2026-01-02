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
 * Shopping cart state
 */
export interface Cart {
  items: CartItem[]
  total: number
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
