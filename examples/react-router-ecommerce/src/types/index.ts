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
 * Products loader response
 */
export interface ProductsLoaderData {
  products: Product[]
  categories: string[]
}

/**
 * Product detail loader response
 */
export interface ProductDetailLoaderData {
  product: Product
  relatedProducts: Product[]
}

/**
 * Cart loader response
 */
export interface CartLoaderData {
  cart: Cart
  products: Product[]
}

/**
 * Orders loader response
 */
export interface OrdersLoaderData {
  orders: Order[]
}

/**
 * Cart action response
 */
export interface CartActionData {
  success: boolean
  message?: string
  cart?: Cart
}

/**
 * Checkout action response
 */
export interface CheckoutActionData {
  success: boolean
  orderId?: string
  error?: string
}
