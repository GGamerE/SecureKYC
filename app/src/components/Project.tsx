import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { SecureKYCABI } from '../contracts/SecureKYC'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import { COUNTRY_CODES } from '../config/fhe'

export default function Project() {
  const [userAddress, setUserAddress] = useState('')
  const [minAge, setMinAge] = useState('')
  const [allowedCountries, setAllowedCountries] = useState<string[]>([])
  const [requiresPassport, setRequiresPassport] = useState(false)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })

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

    try {
      // Convert selected country names to country codes
      const countryCodes = selectedCountries.map(countryName => 
        COUNTRY_CODES[countryName as keyof typeof COUNTRY_CODES]
      ).filter(Boolean)

      if (countryCodes.length === 0) {
        alert('Please select valid countries')
        return
      }
      
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

  const resetForm = () => {
    setUserAddress('')
    setMinAge('')
    setSelectedCountries([])
    setRequiresPassport(false)
  }

  return (
    <div className="space-y-8 slide-in-up">
      {/* Project Header */}
      <div className="card-tech p-6 glow-cyan">
        <div className="flex items-center space-x-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-2">PROJECT ELIGIBILITY CHECKER</h2>
            <p className="text-cyan-400 text-sm">VERIFY USER ELIGIBILITY FOR PROJECT PARTICIPATION</p>
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

      {/* Success Message */}
      {isConfirmed && (
        <div className="alert-tech alert-tech-success">
          <div className="flex items-start space-x-3">
            <div>
              <h3 className="font-semibold mb-2 text-lg">ELIGIBILITY CHECK COMPLETED</h3>
              <p className="text-sm opacity-90 leading-relaxed">
                The eligibility check has been successfully processed on the blockchain. 
                The result indicates whether the user meets the specified project requirements.
              </p>
              <div className="mt-4">
                <p className="text-xs text-gray-300">
                  Transaction Hash: <span className="font-mono text-cyan-400">{hash}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Summary */}
      {(userAddress || minAge || selectedCountries.length > 0) && (
        <div className="card-tech p-6 border-gray-500/30">
          <h3 className="text-lg font-semibold text-white mb-4">PROJECT REQUIREMENTS SUMMARY</h3>
          
          <div className="space-y-3">
            {userAddress && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Target User:</span>
                <span className="text-sm font-mono text-cyan-400">{userAddress.slice(0, 10)}...{userAddress.slice(-8)}</span>
              </div>
            )}
            
            {minAge && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Minimum Age:</span>
                <span className="text-sm text-white">{minAge} years</span>
              </div>
            )}
            
            {selectedCountries.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-300">Allowed Countries:</span>
                <div className="text-sm text-white text-right max-w-xs">
                  {selectedCountries.slice(0, 3).join(', ')}
                  {selectedCountries.length > 3 && ` +${selectedCountries.length - 3} more`}
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Passport Required:</span>
              <span className={`text-sm ${requiresPassport ? 'text-green-400' : 'text-gray-400'}`}>
                {requiresPassport ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}