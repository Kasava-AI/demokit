/**
 * Cart storage utilities
 *
 * Simple localStorage-based cart persistence for demo purposes
 */

import type { Cart } from '@/types'

const CART_KEY = 'cart'

/**
 * Get cart from localStorage
 */
export function getCart(): Cart {
  if (typeof window === 'undefined') {
    return { items: [], total: 0 }
  }

  const stored = localStorage.getItem(CART_KEY)
  if (!stored) {
    return { items: [], total: 0 }
  }

  try {
    return JSON.parse(stored) as Cart
  } catch {
    return { items: [], total: 0 }
  }
}

/**
 * Save cart to localStorage
 */
export function saveCart(cart: Cart): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
}

/**
 * Add item to cart
 */
export function addToCart(product_id: string, quantity: number = 1): Cart {
  const cart = getCart()
  const existingIndex = cart.items.findIndex((item) => item.product_id === product_id)

  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += quantity
  } else {
    cart.items.push({ product_id, quantity })
  }

  saveCart(cart)
  return cart
}

/**
 * Update item quantity in cart
 */
export function updateCartItemQuantity(product_id: string, quantity: number): Cart {
  const cart = getCart()
  const existingIndex = cart.items.findIndex((item) => item.product_id === product_id)

  if (existingIndex >= 0) {
    if (quantity <= 0) {
      cart.items.splice(existingIndex, 1)
    } else {
      cart.items[existingIndex].quantity = quantity
    }
  }

  saveCart(cart)
  return cart
}

/**
 * Remove item from cart
 */
export function removeFromCart(product_id: string): Cart {
  const cart = getCart()
  cart.items = cart.items.filter((item) => item.product_id !== product_id)
  saveCart(cart)
  return cart
}

/**
 * Clear the cart
 */
export function clearCart(): Cart {
  const emptyCart: Cart = { items: [], total: 0 }
  saveCart(emptyCart)
  return emptyCart
}

/**
 * Get cart item count
 */
export function getCartItemCount(): number {
  const cart = getCart()
  return cart.items.reduce((sum, item) => sum + item.quantity, 0)
}
