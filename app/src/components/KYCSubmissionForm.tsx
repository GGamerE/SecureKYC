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
          <div className="icon-tech-success mx-auto mb-6 glow-green">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
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
        <div className="icon-tech" style={{ width: '2.5rem', height: '2.5rem' }}>
          <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '1.25rem', height: '1.25rem' }}>
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">KYC DATA SUBMISSION</h2>
          <p className="text-cyan-400 text-sm">SECURE IDENTITY VERIFICATION PROTOCOL</p>
        </div>
      </div>
      
      <div className="alert-tech alert-tech-info mb-8">
        <div className="flex items-start space-x-3">
          <div className="icon-tech" style={{ width: '1.5rem', height: '1.5rem', marginTop: '0.25rem' }}>
            <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '0.75rem', height: '0.75rem' }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
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
            className="btn-tech w-full py-4 px-6 text-lg font-semibold glow-cyan pulse-glow"
            style={{ width: '100%' }}
          >
            {isSubmitting || isConfirming ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                <span>{isSubmitting ? 'ENCRYPTING & TRANSMITTING...' : 'CONFIRMING ON BLOCKCHAIN...'}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>INITIATE SECURE TRANSMISSION</span>
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}