import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'
import type { Product, Cart, CartItem, Order } from '@/app/types'

const t = initTRPC.create()

const router = t.router
const publicProcedure = t.procedure

// In-memory data store (simulates database)
const products: Product[] = [
  {
    id: 'p1',
    name: 'Laptop Pro',
    price: 999,
    category: 'electronics',
    stock: 15,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
    description: 'Powerful laptop for professionals with 16GB RAM, 512GB SSD, and stunning Retina display. Perfect for development, design, and multitasking.',
  },
  {
    id: 'p2',
    name: 'Wireless Headphones',
    price: 199,
    category: 'electronics',
    stock: 42,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    description: 'Premium wireless headphones with active noise cancellation, 30-hour battery life, and crystal-clear audio quality.',
  },
  {
    id: 'p3',
    name: 'Mechanical Keyboard',
    price: 149,
    category: 'accessories',
    stock: 28,
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=300&fit=crop',
    description: 'RGB mechanical keyboard with Cherry MX switches, N-key rollover, and programmable macros for gaming and productivity.',
  },
  {
    id: 'p4',
    name: 'USB-C Hub',
    price: 79,
    category: 'accessories',
    stock: 67,
    image: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=300&fit=crop',
    description: '7-in-1 USB-C hub with HDMI, USB 3.0 ports, SD card reader, and 100W power delivery for all your connectivity needs.',
  },
  {
    id: 'p5',
    name: '4K Monitor',
    price: 449,
    category: 'electronics',
    stock: 12,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop',
    description: '27-inch 4K UHD monitor with HDR support, 144Hz refresh rate, and USB-C connectivity. Perfect for creative professionals.',
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
    const product = products.find((p) => p.id === item.productId)
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
              p.description.toLowerCase().includes(searchLower)
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
          productId: z.string(),
          quantity: z.number().min(1).default(1),
        })
      )
      .mutation(({ input }) => {
        const product = products.find((p) => p.id === input.productId)
        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
          })
        }

        const existingItem = sessionCart.items.find(
          (item) => item.productId === input.productId
        )

        if (existingItem) {
          existingItem.quantity += input.quantity
        } else {
          sessionCart.items.push({
            productId: input.productId,
            quantity: input.quantity,
          })
        }

        sessionCart.total = calculateTotal(sessionCart.items)
        return sessionCart
      }),

    updateItem: publicProcedure
      .input(
        z.object({
          productId: z.string(),
          quantity: z.number().min(0),
        })
      )
      .mutation(({ input }) => {
        const item = sessionCart.items.find(
          (item) => item.productId === input.productId
        )

        if (item) {
          if (input.quantity <= 0) {
            sessionCart.items = sessionCart.items.filter(
              (i) => i.productId !== input.productId
            )
          } else {
            item.quantity = input.quantity
          }
        }

        sessionCart.total = calculateTotal(sessionCart.items)
        return sessionCart
      }),

    removeItem: publicProcedure
      .input(z.object({ productId: z.string() }))
      .mutation(({ input }) => {
        sessionCart.items = sessionCart.items.filter(
          (item) => item.productId !== input.productId
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
        total: sessionCart.total,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      }

      sessionOrders.push(order)
      sessionCart = { items: [], total: 0 }

      return order
    }),
  }),
})

export type AppRouter = typeof appRouter
