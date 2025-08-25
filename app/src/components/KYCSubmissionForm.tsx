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
      <div className="card-tech p-8 slide-in-up">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            KYC DATA TRANSMISSION SUCCESSFUL
          </h3>
          <p className="text-gray-300 mb-6 leading-relaxed">
            Your identity data has been encrypted using FHE and transmitted to the blockchain.
            The verification process will begin once an authorized validator reviews your submission.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-tech-success"
          >
            SUBMIT NEW KYC DATA
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card-tech p-8 slide-in-up glow-cyan">
      <div className="flex items-center space-x-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">KYC DATA SUBMISSION</h2>
          <p className="text-cyan-400 text-sm">SECURE IDENTITY VERIFICATION PROTOCOL</p>
        </div>
      </div>
      
      <div className="alert-tech alert-tech-info mb-8">
        <div className="flex items-start space-x-3">
          <div>
            <h3 className="font-semibold mb-2 text-lg">ENCRYPTION PROTOCOL ACTIVE</h3>
            <p className="text-sm opacity-90 leading-relaxed">
              All data will be processed using Fully Homomorphic Encryption before blockchain storage.
              Only authorized validators with proper cryptographic credentials can access verification data.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-tech">
          <label htmlFor="passportNumber" className="form-label-tech">
            PASSPORT IDENTIFIER
          </label>
          <input
            type="text"
            id="passportNumber"
            value={passportNumber}
            onChange={(e) => setPassportNumber(e.target.value)}
            required
            className="form-input-tech"
            placeholder="ENTER DOCUMENT IDENTIFIER"
          />
        </div>

        <div className="form-tech">
          <label htmlFor="birthYear" className="form-label-tech">
            BIRTH YEAR
          </label>
          <input
            type="number"
            id="birthYear"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            required
            min="1900"
            max={new Date().getFullYear()}
            className="form-input-tech"
            placeholder="YYYY"
          />
        </div>

        <div className="form-tech">
          <label htmlFor="country" className="form-label-tech">
            NATIONALITY
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode)}
            required
            className="form-input-tech"
          >
            {Object.keys(COUNTRY_CODES).map((countryCode) => (
              <option key={countryCode} value={countryCode}>
                {countryCode}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-8">
          <button
            type="submit"
            disabled={isSubmitting || isConfirming || !passportNumber || !birthYear}
            className="btn-tech w-full glow-cyan pulse-glow"
            style={{ width: '100%' }}
          >
            {isSubmitting || isConfirming ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                <span>{isSubmitting ? 'ENCRYPTING & TRANSMITTING...' : 'CONFIRMING ON BLOCKCHAIN...'}</span>
              </div>
            ) : (
              <span>INITIATE SECURE TRANSMISSION</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}