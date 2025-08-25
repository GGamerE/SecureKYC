import { useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useWalletClient } from 'wagmi'
import { SecureKYCABI } from '../contracts/SecureKYC'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import { COUNTRY_CODES } from '../config/fhe'
import { addressToPassport } from '../utils/passportUtils'
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle'

interface UserDashboardProps {
  fheInstance: FhevmInstance
  userAddress: `0x${string}` | undefined
}

export default function UserDashboard({ fheInstance, userAddress }: UserDashboardProps) {
  const [eligibilityProjectName, setEligibilityProjectName] = useState('')
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptedData, setDecryptedData] = useState<{
    passportNumber?: string
    birthYear?: number
    countryCode?: string
  } | null>(null)

  // Get user's verification status
  const { data: verificationStatus } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SecureKYCABI,
    functionName: 'getVerificationStatus',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  })

  // Get user's encrypted KYC data
  const { data: kycData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SecureKYCABI,
    functionName: 'getUserKYCData',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  })


  const { writeContract, data: hash } = useWriteContract()
  const { isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })
  const { data: walletClient } = useWalletClient()


  const handleDecryptData = async () => {
    if (!fheInstance || !userAddress || !walletClient || !kycData) return

    try {
      setIsDecrypting(true)
      console.log('Starting decryption process...')

      // Create keypair for user decryption
      const keypair = fheInstance.generateKeypair()
      
      // Prepare handle-contract pairs for all encrypted data
      const handleContractPairs = [
        { handle: kycData[0], contractAddress: CONTRACT_ADDRESS }, // passport address
        { handle: kycData[1], contractAddress: CONTRACT_ADDRESS }, // birth year
        { handle: kycData[2], contractAddress: CONTRACT_ADDRESS }, // country code
      ]

      const startTimeStamp = Math.floor(Date.now() / 1000).toString()
      const durationDays = "30"
      const contractAddresses = [CONTRACT_ADDRESS]

      // Create EIP712 signature for user decryption
      const eip712 = fheInstance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays)

      console.log('Requesting user signature...')
      const signature = await walletClient.signTypedData({
        account: userAddress,
        domain: eip712.domain,
        types: {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        primaryType: 'UserDecryptRequestVerification',
        message: eip712.message,
      })

      console.log('Decrypting data...')
      const result = await fheInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        userAddress,
        startTimeStamp,
        durationDays,
      )

      console.log('Decryption result:', result)

      // Convert passport address back to passport number
      const passportAddress = result[kycData[0]] as string
      const passportNumber = addressToPassport(passportAddress as `0x${string}`)

      // Convert country code back to country name
      const countryCodeNum = Number(result[kycData[2]])
      const countryName = Object.keys(COUNTRY_CODES).find(key => COUNTRY_CODES[key as keyof typeof COUNTRY_CODES] === countryCodeNum)

      setDecryptedData({
        passportNumber: passportNumber || 'Invalid',
        birthYear: Number(result[kycData[1]]),
        countryCode: countryName || 'Unknown'
      })
      
      console.log('Decryption completed successfully')
    } catch (error) {
      console.error('Error decrypting data:', error)
      alert('Failed to decrypt data. Please try again.')
    } finally {
      setIsDecrypting(false)
    }
  }

  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userAddress || !eligibilityProjectName) return

    try {
      // For demo purposes, using example eligibility parameters
      // In a real app, these would come from the project's requirements
      const minAge = 18
      const allowedCountries = [1, 2, 3] // Example country codes
      const requiresPassport = true
      
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: SecureKYCABI,
        functionName: 'checkEligibility',
        args: [userAddress, minAge, allowedCountries, requiresPassport]
      })
    } catch (error) {
      console.error('Error checking eligibility:', error)
    }
  }

  return (
    <div className="space-y-8 slide-in-up">
      {/* Verification Status Card */}
      <div className="card-tech p-8 glow-cyan">
        <div className="flex items-center space-x-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">YOUR IDENTITY VERIFICATION STATUS</h2>
            <p className="text-cyan-400 text-sm">ENCRYPTED KYC PROTOCOL STATUS</p>
          </div>
        </div>
        
        {verificationStatus ? (
          <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-800/30 p-6 rounded-lg border border-gray-600/30">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-300">VERIFICATION STATUS:</span>
              <div className={`inline-flex items-center px-3 py-1 rounded text-xs font-semibold border ${
                verificationStatus[0] 
                  ? 'bg-green-900/30 text-green-400 border-green-500/30' 
                  : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'
              }`}>
                {verificationStatus[0] ? 'VERIFIED' : 'PENDING VERIFICATION'}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-300">VERIFICATION DATE:</span>
              <span className="text-sm font-semibold text-white font-mono">
                {verificationStatus[0] 
                  ? new Date(Number(verificationStatus[1]) * 1000).toLocaleDateString()
                  : '---'
                }
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-300">VERIFIED BY:</span>
              <span className="text-sm font-mono text-cyan-400">
                {verificationStatus[0] 
                  ? `${verificationStatus[2].slice(0, 10)}...`
                  : '---'
                }
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">NO KYC DATA FOUND. PLEASE SUBMIT YOUR IDENTITY INFORMATION FIRST.</p>
          </div>
        )}

        {kycData && (
          <div className="mt-8 alert-tech alert-tech-info">
            <div className="flex items-start space-x-3">
              <div className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">ENCRYPTED DATA STATUS</h3>
                  <button
                    onClick={handleDecryptData}
                    disabled={isDecrypting || !fheInstance || !walletClient}
                    className="btn-tech-small glow-cyan"
                  >
                    {isDecrypting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>DECRYPTING...</span>
                      </div>
                    ) : (
                      <span>DECRYPT DATA</span>
                    )}
                  </button>
                </div>
                
                <p className="text-sm opacity-90 leading-relaxed mb-4">
                  Your KYC data is securely encrypted on-chain using FHE protocols. Click the decrypt button to view your personal information.
                </p>

                {!decryptedData ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${kycData[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      <span className="text-xs text-white font-mono">
                        PASSPORT: {kycData[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'ENCRYPTED ✓' : 'NOT SET'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${kycData[1] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      <span className="text-xs text-white font-mono">
                        BIRTH YEAR: {kycData[1] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'ENCRYPTED ✓' : 'NOT SET'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${kycData[2] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      <span className="text-xs text-white font-mono">
                        COUNTRY: {kycData[2] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'ENCRYPTED ✓' : 'NOT SET'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="card-tech p-6 border-green-500/30 bg-gray-800/50">
                    <h4 className="font-semibold text-white mb-4">DECRYPTED PERSONAL DATA</h4>
                    <div className="flex flex-wrap gap-8 justify-center md:justify-start">
                      <div className="text-center">
                        <p className="text-xs text-gray-300 mb-2">PASSPORT NUMBER</p>
                        <p className="text-lg text-green-400 font-mono font-bold">{decryptedData.passportNumber}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-300 mb-2">BIRTH YEAR</p>
                        <p className="text-lg text-green-400 font-mono font-bold">{decryptedData.birthYear}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-300 mb-2">COUNTRY</p>
                        <p className="text-lg text-green-400 font-mono font-bold">{decryptedData.countryCode}</p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <p className="text-xs text-gray-400">Data decrypted successfully using your private key</p>
                      <button
                        onClick={() => setDecryptedData(null)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                      >
                        HIDE DATA
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Project Interaction Cards */}
      {verificationStatus && verificationStatus[0] && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Check Eligibility */}
          <div className="card-tech p-6 border-cyan-500/30">
            <h3 className="text-lg font-semibold text-white mb-6">CHECK PROJECT ELIGIBILITY</h3>
            
            <form onSubmit={handleCheckEligibility} className="space-y-6">
              <div className="form-tech">
                <label htmlFor="eligibilityProjectName" className="form-label-tech">
                  PROJECT NAME (DEMO)
                </label>
                <input
                  type="text"
                  id="eligibilityProjectName"
                  value={eligibilityProjectName}
                  onChange={(e) => setEligibilityProjectName(e.target.value)}
                  required
                  className="form-input-tech"
                  placeholder="ENTER PROJECT IDENTIFIER"
                />
              </div>
              
              <button
                type="submit"
                disabled={!eligibilityProjectName}
                className="btn-tech w-full glow-cyan pulse-glow"
                style={{ width: '100%' }}
              >
                <span>VERIFY ELIGIBILITY</span>
              </button>
            </form>
            
            <div className="mt-6 alert-tech alert-tech-info">
              <div className="flex items-start space-x-3">
                <div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    This will check if you meet the project requirements using encrypted computation without revealing your personal information.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Proof - Disabled */}
          <div className="card-tech p-6 border-gray-500/30 opacity-50">
            <h3 className="text-lg font-semibold text-white mb-6">GENERATE ELIGIBILITY PROOF</h3>
            
            <div className="alert-tech alert-tech-warning">
              <div className="flex items-start space-x-3">
                <div>
                  <h4 className="font-semibold mb-2">FEATURE CURRENTLY DISABLED</h4>
                  <p className="text-sm opacity-90 leading-relaxed">
                    The proof generation feature is not available in the current contract version. 
                    You can still check eligibility for projects using encrypted protocols.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="alert-tech alert-tech-success">
          <div className="flex items-start space-x-3">
            <div>
              <h3 className="font-semibold mb-2 text-lg">OPERATION COMPLETED SUCCESSFULLY</h3>
              <p className="text-sm opacity-90 leading-relaxed">
                Your transaction has been confirmed on the blockchain using secure FHE protocols.
              </p>
            </div>
          </div>
        </div>
      )}

      {!verificationStatus?.[0] && verificationStatus !== undefined && (
        <div className="card-tech p-8 border-yellow-500/30">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-4">VERIFICATION PENDING</h3>
            <p className="text-gray-300 leading-relaxed">
              Your encrypted KYC information has been submitted to the blockchain but is still pending verification by an authorized validator.
              Once verified, you'll be able to check eligibility and generate cryptographic proofs for projects.
            </p>
            <div className="mt-6 inline-block px-6 py-2 border border-yellow-400/50 rounded-lg">
              <span className="text-yellow-400 font-mono text-sm pulse-glow">/// AWAITING VALIDATION ///</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}