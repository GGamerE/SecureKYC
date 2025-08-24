# SecureKYC Frontend

A privacy-preserving KYC verification system frontend built with React, Vite, Viem, and Rainbow Kit, integrating Zama's Fully Homomorphic Encryption (FHE) technology.

## Features

- **KYC Data Submission**: Users can securely submit their KYC information (passport number, birth year, country) with FHE encryption
- **KYC Verification**: Authorized verifiers can approve submitted KYC data
- **Project Requirements**: Set eligibility requirements for projects (minimum age, allowed countries, passport requirements)
- **User Dashboard**: View KYC status, check project eligibility, and generate proofs
- **Privacy-Preserving**: All sensitive data is encrypted using FHE before being stored on-chain

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Viem** for Ethereum interactions
- **RainbowKit** for wallet connection
- **Wagmi** for React hooks
- **Zama FHE Relayer SDK** for homomorphic encryption

## Setup

1. Install dependencies:
```bash
npm install
```

2. Update the contract address in `src/config/wagmi.ts`:
```typescript
export const CONTRACT_ADDRESS = '0xYourContractAddress' as `0x${string}`
```

3. Update the WalletConnect project ID in `src/config/wagmi.ts`:
```typescript
projectId: 'your-walletconnect-project-id'
```

4. Start the development server:
```bash
npm run dev
```

## Usage

### For Users

1. **Connect Wallet**: Click "Connect Wallet" to connect your Ethereum wallet
2. **Submit KYC**: 
   - Go to the "Submit KYC" tab
   - Enter your passport number, birth year, and select your country
   - Data will be encrypted using FHE before submission
3. **Wait for Verification**: An authorized verifier must approve your KYC data
4. **Use Dashboard**: 
   - View your verification status
   - Check eligibility for specific projects
   - Generate cryptographic proofs for project participation

### For Verifiers

1. **Verify KYC**: 
   - Go to the "Verify KYC" tab (only available for authorized verifiers)
   - Enter a user's address to check their submission
   - Approve their KYC data after verification
2. **Set Project Requirements**:
   - Go to the "Project Requirements" tab
   - Create new projects with specific requirements (age, countries, passport)
   - View existing project requirements

## Privacy Features

- **Encrypted Data**: All KYC information is encrypted using Zama's FHE before being stored on-chain
- **Zero-Knowledge Proofs**: Users can prove eligibility without revealing actual personal information
- **Access Control**: Only authorized parties can access encrypted data
- **Secure Computation**: Eligibility checks are performed on encrypted data

## File Structure

```
src/
├── components/           # React components
│   ├── KYCSubmissionForm.tsx
│   ├── KYCVerificationPanel.tsx
│   ├── ProjectRequirementsPanel.tsx
│   └── UserDashboard.tsx
├── config/              # Configuration files
│   ├── fhe.ts          # FHE initialization and country codes
│   └── wagmi.ts        # Blockchain and wallet configuration
├── contracts/           # Contract ABIs
│   └── SecureKYC.ts    # SecureKYC contract ABI
├── App.tsx             # Main application component
├── App.css            # Styling (custom utility classes)
└── main.tsx           # Application entry point
```

## Environment Variables

Create a `.env` file in the app directory with:

```
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_CONTRACT_ADDRESS=0xYourContractAddress
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Development

- The app uses custom CSS utility classes (similar to Tailwind) defined in `App.css`
- All blockchain interactions use Viem and Wagmi for type safety
- FHE encryption is handled by the Zama Relayer SDK
- The app is configured for the Sepolia testnet by default

## Contributing

1. Follow the existing code structure and patterns
2. Ensure all sensitive data is properly encrypted
3. Test thoroughly with the deployed smart contracts
4. Use English for all comments and UI text as specified in CLAUDE.md