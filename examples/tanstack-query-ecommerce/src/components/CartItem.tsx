import type { Product, CartItem as CartItemType } from '@/types'
import { useUpdateCartItem, useRemoveFromCart } from '@/hooks/useCart'

interface CartItemProps {
  item: CartItemType
  product: Product
}

/**
 * Single cart item row with quantity controls
 */
export default function CartItem({ item, product }: CartItemProps) {
  const updateCartItem = useUpdateCartItem()
  const removeFromCart = useRemoveFromCart()

  const isUpdating = updateCartItem.isPending || removeFromCart.isPending

  const updateQuantity = (newQuantity: number) => {
    updateCartItem.mutate({ product_id: item.product_id, quantity: newQuantity })
  }

  const removeItem = () => {
    removeFromCart.mutate({ product_id: item.product_id })
  }

  const subtotal = product.price * item.quantity

  return (
    <div
      className={`flex gap-4 border-b py-4 transition-opacity ${isUpdating ? 'opacity-50' : ''}`}
    >
      {/* Product Image */}
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg">
        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col">
        <div className="flex justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{product.name}</h3>
            <p className="mt-1 text-sm text-gray-500">${product.price} each</p>
          </div>
          <p className="font-semibold text-gray-900">${subtotal.toFixed(2)}</p>
        </div>

        {/* Quantity Controls */}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
              className="btn btn-outline btn-sm h-8 w-8 p-0"
            >
              -
            </button>
            <span className="w-8 text-center font-medium">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.quantity + 1)}
              disabled={isUpdating || item.quantity >= product.stock}
              className="btn btn-outline btn-sm h-8 w-8 p-0"
            >
              +
            </button>
          </div>

          <button
            onClick={removeItem}
            disabled={isUpdating}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
