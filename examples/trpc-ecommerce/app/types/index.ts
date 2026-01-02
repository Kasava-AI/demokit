export interface Product {
  id: string
  name: string
  price: number
  category: 'electronics' | 'accessories'
  stock: number
  image: string
  description: string
}

export interface CartItem {
  productId: string
  quantity: number
}

export interface Cart {
  items: CartItem[]
  total: number
}

export interface Order {
  id: string
  items: CartItem[]
  total: number
  status: 'confirmed' | 'shipped' | 'delivered'
  createdAt: string
}

export interface CartItemWithProduct extends CartItem {
  product: Product
}
