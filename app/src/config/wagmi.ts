import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'SecureKYC',
  projectId: 'YOUR_PROJECT_ID', // Get your project ID at https://cloud.walletconnect.com
  chains: [sepolia],
  ssr: false, // If your dApp uses server side rendering (SSR)
});

export const CONTRACT_ADDRESS = '0x001F2b3289A4051dC344D6a8B0b17CbAC597e9f0' as `0x${string}` // TODO: Add deployed contract address