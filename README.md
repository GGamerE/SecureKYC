# SecureKYC - Privacy-Preserving KYC System

A fully encrypted KYC (Know Your Customer) verification system built with Zama's Fully Homomorphic Encryption (FHE) technology. SecureKYC enables privacy-preserving identity verification where personal data remains encrypted on-chain while still allowing eligibility verification for various projects.

## 🌟 Features

- **🔐 Fully Encrypted Storage**: Passport numbers, birth years, and country codes are stored encrypted on-chain
- **🛡️ Privacy-Preserving Verification**: Zero-knowledge proofs of eligibility without revealing personal data  
- **👥 Multi-Party System**: Supports users, verifiers, and project creators
- **🎯 Flexible Requirements**: Projects can set age, country, and passport requirements
- **🏆 Reusable Proofs**: One verification enables multiple project participations
- **⚡ Efficient Operations**: Optimized FHE operations for gas efficiency

## 🏗️ Architecture

### Smart Contracts (`contracts/`)
- **SecureKYC.sol**: Main contract handling encrypted KYC data and proof generation
- Uses Zama FHEVM for homomorphic encryption operations
- Implements access control for verifiers and administrators

### Backend Tasks (`tasks/`) 
- **SecureKYC.ts**: Hardhat tasks for contract interaction via CLI
- Supports KYC submission, verification, project management, and proof generation

### Frontend (`app/`)
- **Next.js Application**: User-friendly interface for all KYC operations
- **React Components**: Modular UI for different user roles
- **Zama SDK Integration**: Client-side encryption and decryption

### Tests (`test/`)
- **Comprehensive Test Suite**: Local and Sepolia testnet testing
- **Gas Analysis**: Performance metrics for FHE operations  
- **End-to-End Workflows**: Complete user journey testing

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm or yarn/pnpm**: Package manager
- **MetaMask**: For frontend interaction

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY  # Optional for verification
```

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
# Local tests
npm test

# Sepolia tests (requires MNEMONIC and INFURA_API_KEY)
npm run test:sepolia
```

### 5. Deploy Contract

```bash
# Deploy to local network
npx hardhat node  # In separate terminal
npx hardhat deploy --network localhost

# Deploy to Sepolia
npx hardhat deploy --network sepolia
```

### 6. Setup Frontend

```bash
cd app
npm install
cp .env.example .env.local
# Update contract address in .env.local
npm run dev
```

## 📱 Usage

### For Users

1. **Submit KYC Data**
   ```bash
   npx hardhat submit-kyc --contract <CONTRACT_ADDRESS> --passport "ABC123456" --birthyear 1990 --country 1 --network sepolia
   ```

2. **Check Verification Status**  
   ```bash
   npx hardhat get-verification-status --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS> --network sepolia
   ```

3. **Generate Eligibility Proof**
   ```bash
   npx hardhat generate-proof --contract <CONTRACT_ADDRESS> --projectid "MyProject" --network sepolia
   ```

### For Verifiers

1. **Verify User KYC**
   ```bash
   npx hardhat verify-kyc --contract <CONTRACT_ADDRESS> --user <USER_ADDRESS> --network sepolia
   ```

2. **Create Project Requirements**
   ```bash
   npx hardhat set-project-requirements --contract <CONTRACT_ADDRESS> --projectid "DeFiProject" --minage 21 --countries "1,2,3" --passport true --network sepolia
   ```

### For Administrators

1. **Authorize Verifiers**
   ```bash  
   npx hardhat authorize-verifier --contract <CONTRACT_ADDRESS> --verifier <VERIFIER_ADDRESS> --authorized true --network sepolia
   ```

## 🔧 Technical Details

### Encryption Scheme

- **Passport Hash**: SHA256 hash of passport number → `euint256` 
- **Birth Year**: Direct encryption → `euint32`
- **Country Code**: 1-255 mapping → `euint8`

### Country Codes

| Code | Country | Code | Country |
|------|---------|------|---------|  
| 1 | United States | 6 | Japan |
| 2 | Canada | 7 | Australia |
| 3 | United Kingdom | 8 | Singapore | 
| 4 | Germany | 9 | Switzerland |
| 5 | France | 10 | Netherlands |

### Gas Costs (Sepolia)

| Operation | Estimated Gas Cost |
|-----------|----------|
| Submit KYC | ~500K gas |
| Verify KYC | ~100K gas |
| Set Requirements | ~200K gas |  
| Generate Proof | ~800K gas |

## 📁 Project Structure

```
SecureKYC/
├── contracts/           # Smart contract source files
│   ├── SecureKYC.sol    # Main KYC contract
│   └── FHECounter.sol   # Example FHE counter
├── deploy/              # Deployment scripts
│   └── deploySecureKYC.ts
├── tasks/               # Hardhat custom tasks
│   └── SecureKYC.ts     # KYC interaction tasks
├── test/                # Test files
│   ├── SecureKYC.ts     # Local tests
│   └── SecureKYCSepolia.ts # Sepolia integration tests
├── app/                 # Next.js frontend
│   ├── src/
│   │   ├── app/         # App router pages
│   │   └── components/  # React components
│   └── package.json
├── docs/                # Documentation
├── hardhat.config.ts    # Hardhat configuration
└── package.json         # Dependencies and scripts
```

## 🧪 Testing

The project includes comprehensive tests covering:

- **Unit Tests**: Individual contract functions
- **Integration Tests**: Complete workflows  
- **Sepolia Tests**: Real network validation
- **Gas Analysis**: Performance benchmarks
- **Error Handling**: Edge cases and failures

```bash
# Run all tests
npm test

# Test specific file  
npx hardhat test test/SecureKYC.ts

# Test on Sepolia
npm run test:sepolia

# Generate coverage report
npm run coverage
```

## 📜 Available Scripts

| Script             | Description              |
| ------------------ | ------------------------ |
| `npm run compile`  | Compile all contracts    |
| `npm run test`     | Run all tests            |
| `npm run test:sepolia` | Run Sepolia tests    |
| `npm run coverage` | Generate coverage report |
| `npm run lint`     | Run linting checks       |
| `npm run clean`    | Clean build artifacts    |

## 🚀 Deployment

### Local Development

```bash
# Start local hardhat node
npx hardhat node

# Deploy to local network (in separate terminal)
npx hardhat deploy --network localhost

# Interact with contract
npx hardhat submit-kyc --contract <ADDRESS> --passport "TEST123" --birthyear 1990 --country 1 --network localhost
```

### Sepolia Testnet

```bash  
# Deploy to Sepolia
npx hardhat deploy --network sepolia

# Verify contract on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

# Run integration tests
npm run test:sepolia
```

## 🔐 Security Features

- **Fully Homomorphic Encryption**: All sensitive data encrypted on-chain
- **Access Control**: Role-based permissions for verifiers and administrators  
- **Zero-Knowledge Proofs**: Eligibility verification without data disclosure
- **Cryptographic Integrity**: Tamper-proof verification system
- **Privacy by Design**: No plaintext personal data ever exposed

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/protocol)
- [Zama Relayer SDK](https://docs.zama.ai/protocol/developer-resources/client-sdks)
- [Hardhat Plugin Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/zama-ai/fhevm/issues)
- **Documentation**: [FHEVM Docs](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

## 🙏 Acknowledgments

- [Zama](https://zama.ai/) for FHEVM technology
- [Hardhat](https://hardhat.org/) for development framework  
- [Next.js](https://nextjs.org/) for frontend framework

---

**Built with ❤️ using Fully Homomorphic Encryption**