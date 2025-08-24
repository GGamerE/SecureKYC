import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { SecureKYCABI } from '../contracts/SecureKYC'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import { COUNTRY_CODES, type CountryCode } from '../config/fhe'
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle'

interface KYCSubmissionFormProps {
  fheInstance: FhevmInstance
  userAddress: `0x${string}` | undefined
}

export default function KYCSubmissionForm({ fheInstance, userAddress }: KYCSubmissionFormProps) {
  const [passportNumber, setPassportNumber] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [country, setCountry] = useState<CountryCode>('US')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userAddress || !fheInstance) return

    try {
      setIsSubmitting(true)

      // Create encrypted input buffer
      const input = fheInstance.createEncryptedInput(CONTRACT_ADDRESS, userAddress)
      
      // Hash the passport number and add encrypted data
      const passportHash = BigInt('0x' + Buffer.from(passportNumber).toString('hex').padStart(64, '0'))
      input.add256(passportHash)
      input.add32(BigInt(birthYear))
      input.add8(BigInt(COUNTRY_CODES[country]))

      // Encrypt the input
      const encryptedInput = await input.encrypt()

      // Submit to contract
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: SecureKYCABI,
        functionName: 'submitKYC',
        args: [
          encryptedInput.handles[0] as unknown as `0x${string}`, // passportHash
          encryptedInput.handles[1] as unknown as `0x${string}`, // birthYear
          encryptedInput.handles[2] as unknown as `0x${string}`, // countryCode
          encryptedInput.inputProof as unknown as `0x${string}`
        ]
      })
    } catch (error) {
      console.error('Error submitting KYC:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isConfirmed) {
    return (
      <div className="bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-green-800 mb-2">
          KYC Data Submitted Successfully!
        </h3>
        <p className="text-green-600 mb-4">
          Your KYC information has been encrypted and submitted to the blockchain.
          It now needs to be verified by an authorized verifier.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Submit Another KYC
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit KYC Information</h2>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Privacy Notice
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Your data will be encrypted using Fully Homomorphic Encryption (FHE) before being stored on-chain.
                Only authorized verifiers can access your information for verification purposes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="passportNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Passport Number
          </label>
          <input
            type="text"
            id="passportNumber"
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your passport number"
          />
        </div>

        <div>
          <label htmlFor="birthYear" className="block text-sm font-medium text-gray-700 mb-2">
            Birth Year
          </label>
          <input
            type="number"
            id="birthYear"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            required
            min="1900"
            max={new Date().getFullYear()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your birth year"
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
            Country
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {Object.keys(COUNTRY_CODES).map((countryCode) => (
              <option key={countryCode} value={countryCode}>
                {countryCode}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting || isConfirming || !passportNumber || !birthYear}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || isConfirming ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isSubmitting ? 'Encrypting & Submitting...' : 'Confirming Transaction...'}
              </div>
            ) : (
              'Submit KYC Information'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}