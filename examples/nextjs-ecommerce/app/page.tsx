import { ProductList } from './components/ProductList'

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to TechShop
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover the latest in tech accessories and electronics.
          <span className="text-purple-600 font-medium"> Try demo mode</span> to explore without affecting real data.
        </p>
      </div>

      {/* Product List */}
      <ProductList />
    </div>
  )
}
