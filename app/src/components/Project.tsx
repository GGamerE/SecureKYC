import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { SecureKYCABI } from '../contracts/SecureKYC'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import { COUNTRY_CODES } from '../config/fhe'
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle'

interface ProjectProps {
  fheInstance: FhevmInstance
}

export default function Project({ fheInstance }: ProjectProps) {
  const [userAddress, setUserAddress] = useState('')
  const [minAge, setMinAge] = useState('')
  const [requiresPassport, setRequiresPassport] = useState(false)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [eligibilityResult, setEligibilityResult] = useState<boolean | null>(null)
  const [encryptedResult, setEncryptedResult] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash 
  })

  const handleCountryToggle = (countryName: string) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryName)) {
        return prev.filter(country => country !== countryName)
      } else {
        return [...prev, countryName]
      }
    })
  }

  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userAddress || !minAge || selectedCountries.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    setEligibilityResult(null)

    try {
      // Convert selected country names to country codes
      const countryCodes = selectedCountries.map(countryName => 
        COUNTRY_CODES[countryName as keyof typeof COUNTRY_CODES]
      ).filter(Boolean)

      if (countryCodes.length === 0) {
        alert('Please select valid countries')
        return
      }
      
      // Call the contract using writeContract
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: SecureKYCABI,
        functionName: 'checkEligibility',
        args: [userAddress as `0x${string}`, parseInt(minAge), countryCodes, requiresPassport]
      })
      
    } catch (error) {
      console.error('Error checking eligibility:', error)
      alert('Failed to check eligibility. Please try again.')
    }
  }

  // Effect to handle transaction completion and get encrypted result
  useEffect(() => {
    if (isConfirmed && hash && publicClient && address && userAddress) {
      handleGetEncryptedResult()
    }
  }, [isConfirmed, hash, publicClient, address, userAddress])

  const handleGetEncryptedResult = async () => {
    try {
      if (!publicClient || !address) return
      
      // Get the encrypted result from the contract using the new view method
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: SecureKYCABI,
        functionName: 'getCheckEligibilityResult',
        args: [address, userAddress as `0x${string}`],
      }) as string

      if (!result || result === '0x' || result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        console.error('No encrypted result found')
        return
      }
      
      setEncryptedResult(result)
      
    } catch (error) {
      console.error('Error getting encrypted result:', error)
      alert('Failed to get eligibility result. Please try again.')
    }
  }

  const handleDecrypt = async () => {
    if (!encryptedResult || !walletClient || !address) return
    
    setIsDecrypting(true)
    
    try {
      // Decrypt the result using FHE user decryption
      const keypair = fheInstance.generateKeypair()
      const handleContractPairs = [{
        handle: encryptedResult,
        contractAddress: CONTRACT_ADDRESS,
      }]
      
      const startTimeStamp = Math.floor(Date.now() / 1000).toString()
      const durationDays = "1"
      const contractAddresses = [CONTRACT_ADDRESS]

      const eip712 = fheInstance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTimeStamp,
        durationDays
      )

      const signature = await walletClient.signTypedData({
        domain: {
          name: eip712.domain.name,
          version: eip712.domain.version,
          chainId: eip712.domain.chainId,
          verifyingContract: eip712.domain.verifyingContract as `0x${string}`,
        },
        types: {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        primaryType: 'UserDecryptRequestVerification',
        message: eip712.message,
      })

      const decryptionResult = await fheInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      )

      const isEligible = decryptionResult[encryptedResult] as boolean
      setEligibilityResult(isEligible)
      
    } catch (error) {
      console.error('Error decrypting result:', error)
      alert('Failed to decrypt eligibility result. Please try again.')
    } finally {
      setIsDecrypting(false)
    }
  }

  const resetForm = () => {
    setUserAddress('')
    setMinAge('')
    setSelectedCountries([])
    setRequiresPassport(false)
    setEligibilityResult(null)
    setEncryptedResult(null)
  }

  return (
    <div className="space-y-8 slide-in-up">
      {/* Project Header */}
      <div className="card-tech p-6 glow-cyan">
        <div className="flex items-center space-x-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-2">PROJECT ELIGIBILITY CHECKER</h2>
          </div>
        </div>
        
        {/* Prominent Notice */}
        <div className="alert-tech alert-tech-info border-2 border-cyan-400/50 bg-cyan-900/20">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 animate-pulse"></div>
            </div>
            <div>
              <h3 className="font-bold text-cyan-300 mb-2 text-lg">🔐 AUTHORIZED PARTICIPANTS ONLY</h3>
              <p className="text-sm text-white leading-relaxed mb-2">
                <strong>Authorized project participants can CHECK USER ELIGIBILITY</strong> using advanced Zama FHE (Fully Homomorphic Encryption) technology.
              </p>
              <p className="text-sm text-cyan-100 leading-relaxed">
                ✨ <strong>Privacy Guaranteed:</strong> You can only verify eligibility status (YES/NO) - user's specific KYC information remains completely encrypted and hidden.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Eligibility Check Form */}
      <div className="card-tech p-6 border-cyan-500/30">
        <h3 className="text-lg font-semibold text-white mb-6">CHECK USER ELIGIBILITY</h3>
        
        <form onSubmit={handleCheckEligibility} className="space-y-6">
          {/* User Address Input */}
          <div className="form-tech">
            <label htmlFor="userAddress" className="form-label-tech">
              USER ADDRESS *
            </label>
            <input
              type="text"
              id="userAddress"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              required
              className="form-input-tech"
              placeholder="0x..."
              pattern="^0x[a-fA-F0-9]{40}$"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the Ethereum address of the user to check eligibility
            </p>
          </div>

          {/* Minimum Age Input */}
          <div className="form-tech">
            <label htmlFor="minAge" className="form-label-tech">
              MINIMUM AGE *
            </label>
            <input
              type="number"
              id="minAge"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              required
              min="0"
              max="150"
              className="form-input-tech"
              placeholder="18"
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum age required for project participation
            </p>
          </div>

          {/* Allowed Countries Selection */}
          <div className="form-tech">
            <label className="form-label-tech mb-3">
              ALLOWED COUNTRIES *
            </label>
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto border border-gray-600/30 rounded-lg p-4 bg-gray-800/30">
              {Object.keys(COUNTRY_CODES).map((countryName) => (
                <label key={countryName} className="flex items-center space-x-2 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(countryName)}
                    onChange={() => handleCountryToggle(countryName)}
                    className="form-checkbox text-cyan-400 bg-gray-700 border-gray-600 rounded focus:ring-cyan-400 focus:ring-2"
                  />
                  <span className="text-sm text-white">{countryName}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Selected: {selectedCountries.length} countries
            </p>
          </div>

          {/* Requires Passport Checkbox */}
          <div className="form-tech">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresPassport}
                onChange={(e) => setRequiresPassport(e.target.checked)}
                className="form-checkbox text-cyan-400 bg-gray-700 border-gray-600 rounded focus:ring-cyan-400 focus:ring-2"
              />
              <span className="form-label-tech mb-0">REQUIRES PASSPORT VERIFICATION</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Check if passport verification is mandatory for this project
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isPending || isConfirming || !userAddress || !minAge || selectedCountries.length === 0}
              className="btn-tech flex-1 glow-cyan pulse-glow"
            >
              {isPending || isConfirming ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  <span>{isPending ? 'SUBMITTING...' : 'CONFIRMING...'}</span>
                </div>
              ) : (
                <span>CHECK ELIGIBILITY</span>
              )}
            </button>
            
            <button
              type="button"
              onClick={resetForm}
              className="btn-tech border border-gray-500/30 text-gray-300 hover:text-white hover:border-gray-400/50"
            >
              RESET
            </button>
          </div>
        </form>

        {/* Information Alert */}
        <div className="mt-8 alert-tech alert-tech-info">
          <div className="flex items-start space-x-3">
            <div>
              <h4 className="font-semibold mb-2">HOW IT WORKS</h4>
              <p className="text-sm opacity-90 leading-relaxed">
                This function performs encrypted eligibility checking using FHE protocols. 
                The user's personal data remains encrypted throughout the verification process, 
                and only the eligibility result (true/false) is revealed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Success Message */}
      {isConfirmed && (
        <div className="alert-tech alert-tech-success">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 rounded-full mt-1 bg-green-400 animate-pulse"></div>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-lg">ELIGIBILITY CHECK COMPLETED</h3>
              <p className="text-sm opacity-90 leading-relaxed">
                The eligibility check transaction has been successfully processed on the blockchain using FHE encryption. 
                The encrypted result is now available for authorized decryption.
              </p>
              <div className="mt-4">
                <p className="text-xs text-gray-300">
                  Transaction Hash: <span className="font-mono text-cyan-400">{hash}</span>
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  User: <span className="font-mono text-cyan-400">{userAddress}</span>
                </p>
              </div>
              <div className="mt-3 p-3 bg-green-900/20 border border-green-400/30 rounded-lg">
                <p className="text-xs text-green-300">
                  <strong>Success:</strong> The eligibility check has been completed and the encrypted result is stored on-chain.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encrypted Result Display */}
      {encryptedResult && (
        <div className="alert-tech alert-tech-info">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-3 h-3 rounded-full mt-1 bg-blue-400 animate-pulse"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 text-lg">🔐 ENCRYPTED RESULT READY</h3>
              <p className="text-sm opacity-90 leading-relaxed mb-3">
                The eligibility check has been completed and the result is encrypted using FHE. 
                Click the decrypt button below to reveal the eligibility status.
              </p>
              
              <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-300 mb-1">Encrypted Handle:</p>
                <p className="text-xs font-mono text-cyan-400 break-all">{encryptedResult}</p>
              </div>
              
              {!eligibilityResult ? (
                <button
                  onClick={handleDecrypt}
                  disabled={isDecrypting}
                  className="btn-tech text-sm px-4 py-2 glow-cyan"
                >
                  {isDecrypting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      <span>DECRYPTING...</span>
                    </div>
                  ) : (
                    <span>🔓 DECRYPT RESULT</span>
                  )}
                </button>
              ) : (
                <p className="text-xs text-green-400">✅ Result decrypted successfully!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Eligibility Result */}
      {eligibilityResult !== null && (
        <div className={`alert-tech ${eligibilityResult ? 'alert-tech-success' : 'alert-tech-error'}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`w-3 h-3 rounded-full mt-1 ${eligibilityResult ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-3 text-lg">
                {eligibilityResult ? '✅ USER ELIGIBLE' : '❌ USER NOT ELIGIBLE'}
              </h3>
              
              {/* User Information */}
              <div className="bg-gray-800/30 border border-gray-600/20 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-white mb-3">VERIFICATION DETAILS</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">Target User:</span>
                    <span className="text-xs font-mono text-cyan-400">{userAddress}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">Minimum Age Required:</span>
                    <span className="text-xs text-white">{minAge} years</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-300">Allowed Countries:</span>
                    <div className="text-xs text-white text-right max-w-xs">
                      {selectedCountries.slice(0, 5).join(', ')}
                      {selectedCountries.length > 5 && ` +${selectedCountries.length - 5} more`}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">Passport Required:</span>
                    <span className={`text-xs ${requiresPassport ? 'text-green-400' : 'text-gray-400'}`}>
                      {requiresPassport ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Result */}
              <p className="text-sm opacity-90 leading-relaxed mb-4">
                {eligibilityResult 
                  ? 'The user meets all the specified project requirements and is eligible to participate.'
                  : 'The user does not meet one or more of the specified project requirements and is not eligible to participate.'
                }
              </p>

              {/* Privacy Protection Notice */}
              <div className="bg-purple-900/20 border border-purple-400/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-purple-300 mb-2">🔐 PRIVACY PROTECTION</h5>
                    <p className="text-xs text-purple-200 leading-relaxed">
                      <strong>Zero-Knowledge Verification:</strong> You can only see the eligibility status (YES/NO) for the specified criteria. 
                      The user's actual age, specific country, passport details, and other personal KYC information remain completely 
                      encrypted and hidden thanks to Fully Homomorphic Encryption (FHE) technology.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}