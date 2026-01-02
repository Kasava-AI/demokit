import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseUrlPattern,
  matchUrl,
  findMatchingPattern,
  clearPatternCache,
  matchQueryKey,
} from './matcher'

describe('parseUrlPattern', () => {
  beforeEach(() => {
    clearPatternCache()
  })

  it('parses simple GET pattern', () => {
    const result = parseUrlPattern('GET /api/users')
    expect(result.method).toBe('GET')
    expect(result.paramNames).toEqual([])
  })

  it('parses pattern with path parameter', () => {
    const result = parseUrlPattern('GET /api/users/:id')
    expect(result.method).toBe('GET')
    expect(result.paramNames).toEqual(['id'])
  })

  it('parses pattern with multiple parameters', () => {
    const result = parseUrlPattern('GET /api/orgs/:orgId/users/:userId')
    expect(result.method).toBe('GET')
    expect(result.paramNames).toEqual(['orgId', 'userId'])
  })

  it('parses wildcard pattern', () => {
    const result = parseUrlPattern('GET /api/files/*')
    expect(result.method).toBe('GET')
    expect(result.paramNames).toEqual([])
  })

  it('throws on invalid pattern without method', () => {
    expect(() => parseUrlPattern('/api/users')).toThrow('Invalid pattern')
  })

  it('throws on pattern without leading slash', () => {
    expect(() => parseUrlPattern('GET api/users')).toThrow('path must start with')
  })
})

describe('matchUrl', () => {
  beforeEach(() => {
    clearPatternCache()
  })

  it('matches simple path', () => {
    const result = matchUrl('GET /api/users', 'GET', '/api/users')
    expect(result).not.toBeNull()
    expect(result?.params).toEqual({})
  })

  it('extracts path parameters', () => {
    const result = matchUrl('GET /api/users/:id', 'GET', '/api/users/123')
    expect(result).not.toBeNull()
    expect(result?.params).toEqual({ id: '123' })
  })

  it('returns null on method mismatch', () => {
    const result = matchUrl('GET /api/users', 'POST', '/api/users')
    expect(result).toBeNull()
  })

  it('returns null on path mismatch', () => {
    const result = matchUrl('GET /api/users', 'GET', '/api/posts')
    expect(result).toBeNull()
  })

  it('matches wildcard patterns', () => {
    const result = matchUrl('GET /api/files/*', 'GET', '/api/files/path/to/file.txt')
    expect(result).not.toBeNull()
  })
})

describe('findMatchingPattern', () => {
  beforeEach(() => {
    clearPatternCache()
  })

  it('finds first matching pattern', () => {
    const fixtures = {
      'GET /api/users': () => [],
      'GET /api/users/:id': () => ({}),
      'POST /api/users': () => ({}),
    }
    const result = findMatchingPattern(fixtures, 'GET', '/api/users/123')
    expect(result).not.toBeNull()
    expect(result?.[0]).toBe('GET /api/users/:id')
  })

  it('returns null when no pattern matches', () => {
    const fixtures = {
      'GET /api/users': () => [],
      'POST /api/users': () => ({}),
    }
    const result = findMatchingPattern(fixtures, 'DELETE', '/api/users')
    expect(result).toBeNull()
  })
})

describe('matchQueryKey', () => {
  it('matches exact string key', () => {
    const result = matchQueryKey(['users'], ['users'])
    expect(result).not.toBeNull()
    expect(result?.matched).toBe(true)
  })

  it('matches key with wildcard', () => {
    const result = matchQueryKey(['users', '123'], ['users', '*'])
    expect(result).not.toBeNull()
    expect(result?.matched).toBe(true)
  })

  it('returns null on mismatch', () => {
    const result = matchQueryKey(['users'], ['posts'])
    expect(result).toBeNull()
  })

  it('returns null on length mismatch', () => {
    const result = matchQueryKey(['users', '123'], ['users'])
    expect(result).toBeNull()
  })
})
