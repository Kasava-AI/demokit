/**
 * Local (offline) demo config: no DemoKit Cloud apiKey involved.
 *
 * `createDemoRuntime()` normally consumes a `CloudFixtureResponse` fetched
 * from DemoKit Cloud (see `packages/core/src/store/runtime.ts`). It only
 * reads the shape of that response — `data`, `mappings`, `models`,
 * `relationships`, `version` — so nothing stops us from constructing one by
 * hand and handing it to the same runtime. That gives this example the real
 * store (FK validation, cascade deletes, op-log persistence across a
 * refresh) instead of a hand-rolled FixtureMap of static handlers.
 *
 * `runtime.fixtures` is a plain `FixtureMap` — pass it straight to
 * `DemoKitProvider`'s `fixtures` prop, exactly like local-mode usage
 * documented on the provider itself.
 */
import {
  createDemoRuntime,
  type CloudFixtureResponse,
  type DataModel,
  type EndpointMapping,
  type Relationship,
} from '@demokit-ai/core'

export const CATEGORIES = ['Apparel', 'Footwear', 'Accessories', 'Home'] as const
export type Category = (typeof CATEGORIES)[number]

export const ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface Product {
  id: string
  name: string
  priceCents: number
  category: Category
}

export interface Order {
  id: string
  status: OrderStatus
  totalCents: number
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  qty: number
}

// ---------------------------------------------------------------------------
// Data models — the pruned shape the store validates mutations against
// (spec §3.1: types, enums, required fields). Only what's actually needed
// for this demo's fields; see packages/core/src/services/schema/types.ts
// for the full DataModel/PropertyDef shape.
// ---------------------------------------------------------------------------

const models: Record<string, DataModel> = {
  Product: {
    name: 'Product',
    type: 'object',
    required: ['name', 'priceCents', 'category'],
    properties: {
      id: { name: 'id', type: 'string' },
      name: { name: 'name', type: 'string', required: true },
      priceCents: { name: 'priceCents', type: 'integer', required: true },
      category: { name: 'category', type: 'string', required: true, enum: [...CATEGORIES] },
    },
  },
  Order: {
    name: 'Order',
    type: 'object',
    required: ['status', 'totalCents'],
    properties: {
      id: { name: 'id', type: 'string' },
      status: { name: 'status', type: 'string', required: true, enum: [...ORDER_STATUSES] },
      totalCents: { name: 'totalCents', type: 'integer', required: true },
    },
  },
  OrderItem: {
    name: 'OrderItem',
    type: 'object',
    required: ['orderId', 'productId', 'qty'],
    properties: {
      id: { name: 'id', type: 'string' },
      orderId: { name: 'orderId', type: 'string', required: true },
      productId: { name: 'productId', type: 'string', required: true },
      qty: { name: 'qty', type: 'integer', required: true },
    },
  },
}

// FK graph: OrderItem -> Order / Product. `required: true` means deleting an
// Order cascades to delete its OrderItems (see createDemoStore's doDelete) —
// exercised for real when the Orders page's "Cancel" button fires a DELETE.
const relationships: Relationship[] = [
  {
    from: { model: 'OrderItem', field: 'orderId' },
    to: { model: 'Order', field: 'id' },
    type: 'many-to-one',
    required: true,
    detectedBy: 'naming-convention',
  },
  {
    from: { model: 'OrderItem', field: 'productId' },
    to: { model: 'Product', field: 'id' },
    type: 'many-to-one',
    required: true,
    detectedBy: 'naming-convention',
  },
]

// ---------------------------------------------------------------------------
// Seed data — ~12 products across the 4 categories, 3 orders with their
// line items.
// ---------------------------------------------------------------------------

const products: Product[] = [
  { id: 'prod-tote-bag', name: 'Canvas Tote Bag', priceCents: 2400, category: 'Accessories' },
  { id: 'prod-wool-beanie', name: 'Wool Beanie', priceCents: 1800, category: 'Apparel' },
  { id: 'prod-running-shoes', name: 'Running Shoes', priceCents: 8900, category: 'Footwear' },
  { id: 'prod-ceramic-mug', name: 'Ceramic Mug', priceCents: 1200, category: 'Home' },
  { id: 'prod-leather-wallet', name: 'Leather Wallet', priceCents: 4500, category: 'Accessories' },
  { id: 'prod-denim-jacket', name: 'Denim Jacket', priceCents: 9800, category: 'Apparel' },
  { id: 'prod-trail-sneakers', name: 'Trail Sneakers', priceCents: 7600, category: 'Footwear' },
  { id: 'prod-table-lamp', name: 'Table Lamp', priceCents: 3400, category: 'Home' },
  { id: 'prod-sunglasses', name: 'Sunglasses', priceCents: 3200, category: 'Accessories' },
  { id: 'prod-cotton-tshirt', name: 'Cotton T-Shirt', priceCents: 2200, category: 'Apparel' },
  { id: 'prod-hiking-boots', name: 'Hiking Boots', priceCents: 11000, category: 'Footwear' },
  { id: 'prod-throw-blanket', name: 'Throw Blanket', priceCents: 4800, category: 'Home' },
]

const orders: Order[] = [
  { id: 'order-1', status: 'Delivered', totalCents: 8900 },
  { id: 'order-2', status: 'Shipped', totalCents: 5800 },
  { id: 'order-3', status: 'Pending', totalCents: 7700 },
]

const orderItems: OrderItem[] = [
  { id: 'item-1', orderId: 'order-1', productId: 'prod-running-shoes', qty: 1 },
  { id: 'item-2', orderId: 'order-2', productId: 'prod-wool-beanie', qty: 2 },
  { id: 'item-3', orderId: 'order-2', productId: 'prod-cotton-tshirt', qty: 1 },
  { id: 'item-4', orderId: 'order-3', productId: 'prod-leather-wallet', qty: 1 },
  { id: 'item-5', orderId: 'order-3', productId: 'prod-sunglasses', qty: 1 },
]

// ---------------------------------------------------------------------------
// Endpoint mappings (spec §4.1). Only response types the projection layer
// (packages/core/src/store/projections.ts) actually implements:
// collection/single/create/delete here. There's no relationship-expansion
// capability in buildProjectionMap today, so GET /api/orders returns bare
// Order rows — no embedded line items. (OrderItem still exists in the store
// for the FK/cascade-delete behavior above; it just isn't exposed as its own
// endpoint in this example.)
// ---------------------------------------------------------------------------

const mappings: EndpointMapping[] = [
  {
    method: 'GET',
    pattern: '/api/products',
    sourceModel: 'Product',
    responseType: 'collection',
    queryParamConfig: {
      filters: { category: 'category' },
      sortParam: 'sort',
    },
  },
  {
    method: 'GET',
    pattern: '/api/products/:id',
    sourceModel: 'Product',
    responseType: 'single',
    lookupField: 'id',
    lookupParam: 'id',
  },
  {
    method: 'GET',
    pattern: '/api/orders',
    sourceModel: 'Order',
    responseType: 'collection',
    queryParamConfig: {
      filters: { status: 'status' },
    },
  },
  {
    method: 'POST',
    pattern: '/api/orders',
    sourceModel: 'Order',
    responseType: 'create',
  },
  {
    method: 'DELETE',
    pattern: '/api/orders/:id',
    sourceModel: 'Order',
    responseType: 'delete',
    lookupParam: 'id',
  },
]

const response: CloudFixtureResponse = {
  version: 'react-ecommerce-local-v1',
  data: {
    Product: products,
    Order: orders,
    OrderItem: orderItems,
  },
  mappings,
  models,
  relationships,
}

const runtime = createDemoRuntime({ response })

if (!runtime) {
  // Only happens if `models`/`relationships` were omitted above — both are
  // always provided here, so this is a defensive guard, not a real path.
  throw new Error('[demo-config] createDemoRuntime returned null — models/relationships missing')
}

/** Pass straight to <DemoKitProvider fixtures={fixtures} transport="msw">. */
export const fixtures = runtime.fixtures

/**
 * To point this example at DemoKit Cloud instead of this local runtime:
 *
 *   import { createRemoteSource } from '@demokit-ai/react'
 *
 *   export const demokitSource = createRemoteSource({
 *     apiUrl: import.meta.env.VITE_DEMOKIT_API_URL!,
 *     apiKey: import.meta.env.VITE_DEMOKIT_API_KEY!,
 *   })
 *
 * ...then swap `fixtures={fixtures}` for `source={demokitSource}` on
 * <DemoKitProvider> in src/App.tsx. See README.md.
 */
