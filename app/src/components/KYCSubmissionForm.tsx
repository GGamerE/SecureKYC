import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { SecureKYCABI } from '../contracts/SecureKYC'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import { converZamaHex, COUNTRY_CODES, type CountryCode } from '../config/fhe'
import { passportToAddress } from '../utils/passportUtils'
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
  
  // Generate passport address for display
  const passportAddress = passportNumber ? passportToAddress(passportNumber) : null

  // Debug logs for component state
  console.log('KYCSubmissionForm render state:', {
    passportNumber,
    birthYear,
    country,
    isSubmitting,
    userAddress,
    fheInstance: !!fheInstance,
    passportAddress
  })

  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })

  // Debug wagmi hooks
  console.log('Wagmi hooks state:', {
    writeContract: !!writeContract,
    hash,
    isConfirming,
    isConfirmed
  })

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== KYC SUBMISSION STARTED ===')
    console.log('Form submitted, preventing default...')
    e.preventDefault()
    
    console.log('Checking prerequisites...')
    console.log('userAddress:', userAddress)
    console.log('fheInstance:', fheInstance)
    console.log('passportNumber:', passportNumber)
    console.log('birthYear:', birthYear)
    console.log('country:', country)
    
    if (!userAddress || !fheInstance) {
      console.error('Missing prerequisites:', { userAddress: !!userAddress, fheInstance: !!fheInstance })
      return
    }

    try {
      console.log('Setting submitting state to true...')
      setIsSubmitting(true)

      console.log('Creating encrypted input buffer...')
      // Create encrypted input buffer
      const input = fheInstance.createEncryptedInput(CONTRACT_ADDRESS, userAddress)
      console.log('Input buffer created:', input)
      
      // Convert passport number to EVM address
      console.log('Converting passport to address...')
      const passportAddress = passportToAddress(passportNumber)
      console.log('Generated passport address:', passportAddress)
      
      // Add encrypted data
      console.log('Adding data to input buffer...')
      console.log('Adding address:', passportAddress)
      input.addAddress(passportAddress)
      
      console.log('Adding birthYear as uint32:', BigInt(birthYear))
      input.add32(BigInt(birthYear))
      
      console.log('Adding country code:', COUNTRY_CODES[country])
      input.add8(BigInt(COUNTRY_CODES[country]))

      console.log('Encrypting input data...')
      // Encrypt the input
      const encryptedInput = await input.encrypt()
      console.log('Encryption completed:', {
        handles: encryptedInput.handles,
        inputProof: encryptedInput.inputProof
      })

      console.log('Preparing contract call...')
      console.log('Contract address:', CONTRACT_ADDRESS)
      console.log('Function args:', [
        encryptedInput.handles[0],
        encryptedInput.handles[1], 
        encryptedInput.handles[2],
        encryptedInput.inputProof
      ])

      // Submit to contract
      console.log('Calling writeContract...')
      const result = writeContract({
        address: CONTRACT_ADDRESS,
        abi: SecureKYCABI,
        functionName: 'submitKYC',
        args: [
        converZamaHex(encryptedInput.handles[0]), // passportAddress
          converZamaHex(encryptedInput.handles[1]), // birthYear
         converZamaHex(encryptedInput.handles[2]), // countryCode
          converZamaHex(encryptedInput.inputProof )
        ]
      })
      console.log('writeContract result:', result)
    } catch (error) {
      console.error('=== ERROR IN KYC SUBMISSION ===')
      console.error('Error type:', typeof error)
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('Full error object:', error)
    } finally {
      console.log('Setting submitting state to false...')
      setIsSubmitting(false)
      console.log('=== KYC SUBMISSION ENDED ===')
    }
  }

  if (isConfirmed) {
    return (
      <div className="card-tech p-6 slide-in-up">
        <div className="text-center">
          <h3 className="text-lg font-bold text-white mb-3">
            KYC DATA TRANSMISSION SUCCESSFUL
          </h3>
          <p className="text-gray-300 mb-4 leading-relaxed text-sm">
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
    <div className="card-tech p-6 slide-in-up glow-cyan">
      <div className="flex items-center space-x-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-2">KYC DATA SUBMISSION</h2>
          <p className="text-cyan-400 text-xs">SECURE IDENTITY VERIFICATION PROTOCOL</p>
        </div>
      </div>
      
      <div className="alert-tech alert-tech-info mb-6">
        <div className="flex items-start space-x-2">
          <div>
            <h3 className="font-semibold mb-2 text-sm">ENCRYPTION PROTOCOL ACTIVE</h3>
            <p className="text-xs opacity-90 leading-relaxed">
              All data will be processed using Fully Homomorphic Encryption before blockchain storage.
              Only authorized validators with proper cryptographic credentials can access verification data.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          {passportAddress && (
            <div className="mt-2 p-2 bg-gray-800 rounded border border-cyan-500/30">
              <div className="text-xs text-cyan-400 mb-1">GENERATED ADDRESS:</div>
              <div className="text-xs text-gray-300 font-mono break-all">{passportAddress}</div>
              <div className="text-xs text-gray-500 mt-1">
                Your passport number will be converted to this address and encrypted before storage
              </div>
            </div>
          )}
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

        <div className="mt-6">
          <button
            type="submit"
            disabled={isSubmitting || isConfirming || !passportNumber || !birthYear}
            className="btn-tech w-full glow-cyan pulse-glow"
            style={{ width: '100%' }}
            onClick={(_) => {
              console.log('Button clicked!')
              console.log('Button disabled?', isSubmitting || isConfirming || !passportNumber || !birthYear)
              console.log('Disabled reasons:', {
                isSubmitting,
                isConfirming,
                noPassportNumber: !passportNumber,
                noBirthYear: !birthYear
              })
            }}
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