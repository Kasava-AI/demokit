import { useState } from 'react'
import { DemoKitProvider, DemoModeToggle } from '@demokit-ai/react'
import { fixtures } from './demo/demo-config'
import { Catalog } from './pages/Catalog'
import { Cart, type CartLine } from './pages/Cart'
import { Orders } from './pages/Orders'
import type { Product } from './demo/demo-config'

type Tab = 'catalog' | 'cart' | 'orders'

function Shell() {
  const [tab, setTab] = useState<Tab>('catalog')
  const [cart, setCart] = useState<CartLine[]>([])

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l))
      }
      return [...prev, { product, qty: 1 }]
    })
  }

  function changeQty(productId: string, qty: number) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, qty } : l)))
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId))
  }

  function handleCheckedOut() {
    setCart([])
    setTab('orders')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>react-ecommerce</h1>
        <nav className="tabs">
          <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>
            Catalog
          </button>
          <button className={tab === 'cart' ? 'active' : ''} onClick={() => setTab('cart')}>
            Cart {cart.length > 0 ? `(${cart.length})` : ''}
          </button>
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
            Orders
          </button>
        </nav>
        <DemoModeToggle />
      </header>

      <main>
        {tab === 'catalog' && <Catalog onAddToCart={addToCart} />}
        {tab === 'cart' && (
          <Cart
            lines={cart}
            onChangeQty={changeQty}
            onRemove={removeFromCart}
            onCheckedOut={handleCheckedOut}
          />
        )}
        {tab === 'orders' && <Orders />}
      </main>
    </div>
  )
}

export function App() {
  return (
    <DemoKitProvider
      fixtures={fixtures}
      transport="msw"
      mswOptions={{ workerUrl: '/mockServiceWorker.js' }}
      // To run against DemoKit Cloud instead of the local store above, swap
      // this for `source={demokitSource}` — see demo/demo-config.ts and
      // README.md for the commented `createRemoteSource()` block.
    >
      <Shell />
    </DemoKitProvider>
  )
}
