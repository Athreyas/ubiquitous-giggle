import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const passwordKeyLength = 64
const tokenBytes = 32

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scrypt(password, salt, passwordKeyLength)) as Buffer
  return `scrypt:${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, hashHex] = storedHash.split(':')
  if (algorithm !== 'scrypt' || !salt || !hashHex) {
    return false
  }

  const expected = Buffer.from(hashHex, 'hex')
  const actual = (await scrypt(password, salt, expected.length)) as Buffer

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function createToken(): string {
  return randomBytes(tokenBytes).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function tokenExpiry(from = new Date()): string {
  const expires = new Date(from)
  expires.setDate(expires.getDate() + 30)
  return expires.toISOString()
}
