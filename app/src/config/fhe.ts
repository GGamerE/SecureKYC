import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/bundle";

export const initFHE = async () => {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const config = { ...SepoliaConfig, network: window.ethereum };
      return await createInstance(config);
    } else {
      throw new Error('No Ethereum provider found');
    }
  } catch (error) {
    console.error('Failed to initialize FHE instance:', error);
    throw error;
  }
};

export const COUNTRY_CODES = {
  'US': 1,
  'UK': 2, 
  'CA': 3,
  'AU': 4,
  'FR': 5,
  'DE': 6,
  'IT': 7,
  'ES': 8,
  'NL': 9,
  'CH': 10,
  'JP': 11,
  'KR': 12,
  'CN': 13,
  'SG': 14,
  'HK': 15
} as const;

export type CountryCode = keyof typeof COUNTRY_CODES;