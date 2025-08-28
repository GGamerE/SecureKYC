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

  // Effect to handle transaction completion and decryption
  useEffect(() => {
    if (isConfirmed && hash && publicClient && walletClient && address && userAddress) {
      handleDecryptResult()
    }
  }, [isConfirmed, hash, publicClient, walletClient, address, userAddress, fheInstance])

  const handleDecryptResult = async () => {
    try {
      if (!publicClient || !walletClient || !address) return
      
      // Get the encrypted result from the contract using the new view method
      const encryptedResult = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: SecureKYCABI,
        functionName: 'getCheckEligibilityResult',
        args: [address, userAddress as `0x${string}`],
      }) as string

      if (!encryptedResult || encryptedResult === '0x') {
        console.error('No encrypted result found')
        return
      }
      
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
    }
  }

  const resetForm = () => {
    setUserAddress('')
    setMinAge('')
    setSelectedCountries([])
    setRequiresPassport(false)
    setEligibilityResult(null)
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
              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-400/30 rounded-lg">
                <p className="text-xs text-blue-300">
                  <strong>Processing:</strong> The encrypted eligibility result is now being decrypted using FHE user decryption. 
                  Please wait for the decryption process to complete...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Eligibility Result (for future implementation) */}
      {eligibilityResult !== null && (
        <div className={`alert-tech ${eligibilityResult ? 'alert-tech-success' : 'alert-tech-error'}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`w-3 h-3 rounded-full mt-1 ${eligibilityResult ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-lg">
                {eligibilityResult ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}
              </h3>
              <p className="text-sm opacity-90 leading-relaxed">
                {eligibilityResult 
                  ? 'The user meets all the specified project requirements and is eligible to participate.'
                  : 'The user does not meet the specified project requirements and is not eligible to participate.'
                }
              </p>
              <div className="mt-4">
                <p className="text-xs text-gray-300">
                  User: <span className="font-mono text-cyan-400">{userAddress}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}