import { keccak256, toBytes } from 'viem'

/**
 * Convert passport number to EVM address (reversible)
 * Uses padding method to allow bidirectional conversion
 * @param passportNumber - The passport number string (max 20 characters)
 * @returns EVM address as 0x prefixed string
 */
export function passportToAddress(passportNumber: string): `0x${string}` {
  if (passportNumber.length > 20) {
    throw new Error("Passport number too long (max 20 characters)")
  }
  
  // Convert passport number to bytes
  const passportBytes = toBytes(passportNumber)
  
  // Pad to 20 bytes (address length) with zeros
  const paddedBytes = new Uint8Array(20)
  paddedBytes.set(passportBytes)
  
  // Convert to hex string with 0x prefix
  const hexString = Array.from(paddedBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  
  return `0x${hexString}` as `0x${string}`
}

/**
 * Convert EVM address back to passport number (now possible with padding method)
 * @param address - The EVM address to convert back
 * @returns The original passport number or null if invalid
 */
export function addressToPassport(address: `0x${string}`): string | null {
  try {
    if (!isValidPassportAddress(address)) {
      return null
    }
    
    // Remove 0x prefix and convert hex to bytes
    const hexString = address.slice(2)
    const bytes = new Uint8Array(hexString.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || [])
    
    // Convert bytes to string and remove null padding
    const decoder = new TextDecoder('utf-8')
    const decoded = decoder.decode(bytes)
    const passport = decoded.replace(/\0+$/, '') // Remove trailing null bytes
    
    // Validate result (should contain only valid passport characters)
    if (passport.length === 0 || !/^[A-Za-z0-9]+$/.test(passport)) {
      return null
    }
    
    return passport
  } catch (error) {
    console.warn('Error converting address to passport:', error)
    return null
  }
}

/**
 * Validate if an address could be a passport-derived address
 * @param address - The EVM address to validate
 * @returns boolean indicating if it's a valid address format
 */
export function isValidPassportAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Test bidirectional conversion to ensure it works correctly
 * @param passportNumber - The passport number to test
 * @returns boolean indicating if conversion is successful
 */
export function testBidirectionalConversion(passportNumber: string): boolean {
  try {
    const address = passportToAddress(passportNumber)
    const recovered = addressToPassport(address)
    return recovered === passportNumber
  } catch (error) {
    console.error('Bidirectional conversion test failed:', error)
    return false
  }
}

/**
 * Generate a demo showing the bidirectional conversion
 * @param passportNumber - The passport number string
 * @returns Object with conversion results
 */
export function demonstrateConversion(passportNumber: string) {
  try {
    const address = passportToAddress(passportNumber)
    const recovered = addressToPassport(address)
    const isSuccessful = recovered === passportNumber
    
    return {
      original: passportNumber,
      address: address,
      recovered: recovered,
      successful: isSuccessful,
      error: null
    }
  } catch (error) {
    return {
      original: passportNumber,
      address: null,
      recovered: null,
      successful: false,
      error: (error as Error).message
    }
  }
}