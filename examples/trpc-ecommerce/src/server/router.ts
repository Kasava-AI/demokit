import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { Product, Cart, CartItem, Order } from '@/app/types'

const t = initTRPC.create()

const router = t.router
const publicProcedure = t.procedure

// In-memory data store (simulates database)
const products: Product[] = [
  {
    id: 'b413498c-f14c-4c03-aac0-dfc25ed4311f',
    name: 'MacBook Pro 14-inch M3',
    price: 1999.99,
    category: 'Electronics',
    stock: 15,
    image_url: 'https://example.com/images/macbook-pro-14.jpg',
    description: 'Apple MacBook Pro 14-inch with M3 chip, 8GB RAM, 512GB SSD. Perfect for professional work and creative projects.',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '73a15e65-66d6-4e42-81d0-09578390e2ad',
    name: 'Dell XPS 13 Plus',
    price: 1299.99,
    category: 'Electronics',
    stock: 22,
    image_url: 'https://example.com/images/dell-xps-13.jpg',
    description: 'Dell XPS 13 Plus with Intel Core i7, 16GB RAM, 1TB SSD. Ultra-portable design with stunning display.',
    created_at: '2024-01-10T14:30:00Z',
    updated_at: '2024-01-10T14:30:00Z',
  },
  {
    id: 'e8b2f4ba-897b-43b0-af33-0552b3c3d344',
    name: 'Wireless Bluetooth Headphones',
    price: 199.99,
    category: 'Electronics',
    stock: 45,
    image_url: 'https://example.com/images/bluetooth-headphones.jpg',
    description: 'Premium wireless headphones with active noise cancellation and 30-hour battery life.',
    created_at: '2024-01-08T09:15:00Z',
    updated_at: '2024-01-08T09:15:00Z',
  },
  {
    id: '2ee21613-ee15-4b2e-a4b5-ad66a67a39fa',
    name: 'USB-C Hub 7-in-1',
    price: 49.99,
    category: 'Electronics',
    stock: 78,
    image_url: 'https://example.com/images/usb-c-hub.jpg',
    description: 'Versatile USB-C hub with HDMI, USB 3.0 ports, SD card reader, and power delivery support.',
    created_at: '2024-01-05T16:45:00Z',
    updated_at: '2024-01-05T16:45:00Z',
  },
  {
    id: 'fee88cc9-166f-4b32-9c65-2b91c39fadb7',
    name: 'Portable Phone Stand',
    price: 24.99,
    category: 'Accessories',
    stock: 120,
    image_url: 'https://example.com/images/phone-stand.jpg',
    description: 'Adjustable aluminum phone stand compatible with all smartphone sizes. Perfect for video calls and media viewing.',
    created_at: '2024-01-03T11:20:00Z',
    updated_at: '2024-01-03T11:20:00Z',
  },
]

// Session cart state
let sessionCart: Cart = {
  items: [],
  total: 0,
}

// Session orders
let sessionOrders: Order[] = []

// Helper to calculate cart total
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.product_id)
    return sum + (product?.price ?? 0) * item.quantity
  }, 0)
}

export const appRouter = router({
  // Product procedures
  product: router({
    list: publicProcedure
      .input(
        z.object({
          category: z.string().optional(),
          search: z.string().optional(),
        }).optional()
      )
      .query(({ input }) => {
        let result = products

        if (input?.category) {
          result = result.filter((p) => p.category === input.category)
        }

        if (input?.search) {
          const searchLower = input.search.toLowerCase()
          result = result.filter(
            (p) =>
              p.name.toLowerCase().includes(searchLower) ||
              p.description?.toLowerCase().includes(searchLower)
          )
        }

        return result
      }),

    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        const product = products.find((p) => p.id === input.id)
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
          })
        }
        return product
      }),
  }),

  // Cart procedures
  cart: router({
    get: publicProcedure.query(() => sessionCart),

    addItem: publicProcedure
      .input(
        z.object({
          product_id: z.string(),
          quantity: z.number().min(1).default(1),
        })
      )
      .mutation(({ input }) => {
        const product = products.find((p) => p.id === input.product_id)
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
          })
        }

        const existingItem = sessionCart.items.find(
          (item) => item.product_id === input.product_id
        )

        if (existingItem) {
          existingItem.quantity += input.quantity
        } else {
          sessionCart.items.push({
            product_id: input.product_id,
            quantity: input.quantity,
          })
        }

        sessionCart.total = calculateTotal(sessionCart.items)
        return sessionCart
      }),

    updateItem: publicProcedure
      .input(
        z.object({
          product_id: z.string(),
          quantity: z.number().min(0),
        })
      )
      .mutation(({ input }) => {
        const item = sessionCart.items.find(
          (item) => item.product_id === input.product_id
        )

        if (item) {
          if (input.quantity <= 0) {
            sessionCart.items = sessionCart.items.filter(
              (i) => i.product_id !== input.product_id
            )
          } else {
            item.quantity = input.quantity
          }
        }

        sessionCart.total = calculateTotal(sessionCart.items)
        return sessionCart
      }),

    removeItem: publicProcedure
      .input(z.object({ product_id: z.string() }))
      .mutation(({ input }) => {
        sessionCart.items = sessionCart.items.filter(
          (item) => item.product_id !== input.product_id
        )
        sessionCart.total = calculateTotal(sessionCart.items)
        return sessionCart
      }),

    clear: publicProcedure.mutation(() => {
      sessionCart = { items: [], total: 0 }
      return sessionCart
    }),
  }),

  // Order procedures
  order: router({
    list: publicProcedure.query(() => sessionOrders),

    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        const order = sessionOrders.find((o) => o.id === input.id)
        if (!order) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Order not found',
          })
        }
        return order
      }),

    create: publicProcedure.mutation(() => {
      if (sessionCart.items.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cart is empty',
        })
      }

      const order: Order = {
        id: `order-${Date.now()}`,
        items: [...sessionCart.items],
        total_amount: sessionCart.total,
        status: 'confirmed',
        created_at: new Date().toISOString(),
      }

      sessionOrders.push(order)
      sessionCart = { items: [], total: 0 }

      return order
    }),
  }),
})

export type AppRouter = typeof appRouter
