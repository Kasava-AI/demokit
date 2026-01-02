/**
 * ID generation utilities for demo data
 *
 * Generates consistent, deterministic IDs for reproducible fixtures.
 */

/**
 * Generate a UUID v4 (random)
 * Uses a simple implementation for portability
 */
export function generateUUID(): string {
  const hex = '0123456789abcdef'
  let uuid = ''

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-'
    } else if (i === 14) {
      uuid += '4' // Version 4
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8] // Variant bits
    } else {
      uuid += hex[Math.floor(Math.random() * 16)]
    }
  }

  return uuid
}

/**
 * Generate a deterministic UUID from a seed
 * Useful for reproducible fixtures
 */
export function generateSeededUUID(seed: number): string {
  // Simple seeded random number generator (LCG)
  const next = (s: number): [number, number] => {
    const newSeed = (s * 1664525 + 1013904223) >>> 0
    return [newSeed, newSeed / 0xffffffff]
  }

  const hex = '0123456789abcdef'
  let uuid = ''
  let currentSeed = seed

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-'
    } else if (i === 14) {
      uuid += '4' // Version 4
    } else if (i === 19) {
      const [newSeed, rand] = next(currentSeed)
      currentSeed = newSeed
      uuid += hex[Math.floor(rand * 4) + 8] // Variant bits
    } else {
      const [newSeed, rand] = next(currentSeed)
      currentSeed = newSeed
      uuid += hex[Math.floor(rand * 16)]
    }
  }

  return uuid
}

/**
 * Generate a model-specific ID
 * Format: {prefix}_{index} or UUID based on format hint
 */
export function generateIdForModel(
  modelName: string,
  index: number,
  format?: string
): string {
  if (format === 'uuid') {
    return generateSeededUUID(hashString(modelName) + index)
  }

  // Use lowercase prefix with underscore
  const prefix = modelName.toLowerCase().slice(0, 4)
  return `${prefix}_${String(index + 1).padStart(3, '0')}`
}

/**
 * Generate an ID based on a property definition
 */
export function generateId(format?: string, index: number = 0): string {
  if (format === 'uuid') {
    return generateSeededUUID(index * 12345)
  }

  return `id_${String(index + 1).padStart(3, '0')}`
}

/**
 * Generate a prefixed ID
 * @example generatePrefixedId('user', 1) => 'user_001'
 */
export function generatePrefixedId(prefix: string, index: number): string {
  return `${prefix}_${String(index + 1).padStart(3, '0')}`
}

/**
 * Generate a CUID-like ID
 * Format: c + timestamp + random
 */
export function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `c${timestamp}${random}`
}

/**
 * Generate a ULID-like ID
 * Format: timestamp (10 chars) + random (16 chars)
 */
export function generateUlid(): string {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford's Base32
  const timestamp = Date.now()

  // Encode timestamp (10 characters)
  let encoded = ''
  let t = timestamp
  for (let i = 0; i < 10; i++) {
    encoded = chars[t % 32] + encoded
    t = Math.floor(t / 32)
  }

  // Add random characters (16 characters)
  for (let i = 0; i < 16; i++) {
    encoded += chars[Math.floor(Math.random() * 32)]
  }

  return encoded
}

/**
 * Simple string hash function for seeding
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Check if a string looks like a UUID
 */
export function isUUIDFormat(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Check if a string looks like a CUID
 */
export function isCuidFormat(value: string): boolean {
  return /^c[a-z0-9]{20,}$/.test(value)
}

/**
 * Check if a string looks like a ULID
 */
export function isUlidFormat(value: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value)
}
