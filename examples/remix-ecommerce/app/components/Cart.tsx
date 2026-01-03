import { Link, useFetcher } from '@remix-run/react'
import type { Product, CartItem } from '~/types'

interface CartItemWithProduct extends CartItem {
  product: Product
}

interface CartProps {
  items: CartItemWithProduct[]
  total: number
}

export function Cart({ items, total }: CartProps) {
  const fetcher = useFetcher()

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Your cart is empty</h3>
        <p className="mt-2 text-gray-500">Add some products to get started.</p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700"
        >
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {items.map((item) => (
        <div key={item.product_id} className="flex gap-4 py-4">
          {/* Product Image */}
          <Link
            to={`/products/${item.product_id}`}
            className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100"
          >
            <img
              src={item.product.image_url}
              alt={item.product.name}
              className="h-full w-full object-cover"
            />
          </Link>

          {/* Product Info */}
          <div className="flex flex-1 flex-col">
            <div className="flex justify-between">
              <Link
                to={`/products/${item.product_id}`}
                className="font-medium text-gray-900 hover:text-blue-600"
              >
                {item.product.name}
              </Link>
              <span className="font-medium text-gray-900">
                ${(item.product.price * item.quantity).toLocaleString()}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500 capitalize">{item.product.category}</p>

            <div className="mt-auto flex items-center justify-between pt-2">
              {/* Quantity Controls */}
              <fetcher.Form method="post" action="/cart" className="flex items-center gap-2">
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="product_id" value={item.product_id} />
                <button
                  type="submit"
                  name="quantity"
                  value={Math.max(1, item.quantity - 1)}
                  className="rounded border border-gray-300 p-1 hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  type="submit"
                  name="quantity"
                  value={item.quantity + 1}
                  className="rounded border border-gray-300 p-1 hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </fetcher.Form>

              {/* Remove Button */}
              <fetcher.Form method="post" action="/cart">
                <input type="hidden" name="intent" value="remove" />
                <input type="hidden" name="product_id" value={item.product_id} />
                <button type="submit" className="text-sm text-red-600 hover:text-red-800">
                  Remove
                </button>
              </fetcher.Form>
            </div>
          </div>
        </div>
      ))}

      {/* Cart Total */}
      <div className="pt-4">
        <div className="flex justify-between text-lg font-bold text-gray-900">
          <span>Total</span>
          <span>${total.toLocaleString()}</span>
        </div>
        <Link
          to="/checkout"
          className="mt-4 block w-full rounded-lg bg-blue-600 py-3 text-center font-medium text-white hover:bg-blue-700"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  )
}
