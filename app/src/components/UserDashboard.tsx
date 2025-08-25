import { useState } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { SecureKYCABI } from '../contracts/SecureKYC'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle'

interface UserDashboardProps {
  fheInstance: FhevmInstance
  userAddress: `0x${string}` | undefined
}

export default function UserDashboard({ userAddress }: UserDashboardProps) {
  const [eligibilityProjectName, setEligibilityProjectName] = useState('')

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
    <div className="space-y-6">
      {/* Verification Status Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your KYC Status</h2>
        
        {verificationStatus ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                verificationStatus[0] 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {verificationStatus[0] ? 'Verified' : 'Pending Verification'}
              </div>
              <p className="mt-2 text-sm text-gray-500">Verification Status</p>
            </div>
            
            {verificationStatus[0] && (
              <>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(Number(verificationStatus[1]) * 1000).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">Verification Date</p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm font-mono text-gray-900 break-all">
                    {verificationStatus[2].slice(0, 10)}...
                  </p>
                  <p className="text-sm text-gray-500">Verified By</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No KYC data found. Please submit your KYC information first.</p>
          </div>
        )}

        {kycData && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Encrypted Data Status</h3>
            <p className="text-sm text-blue-700">
              Your KYC data is securely encrypted on-chain. Only you and authorized verifiers can access this information.
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-blue-600">
                Passport Address: {kycData[0] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'Encrypted ✓' : 'Not set'}
              </p>
              <p className="text-xs text-blue-600">
                Birth Year: {kycData[1] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'Encrypted ✓' : 'Not set'}
              </p>
              <p className="text-xs text-blue-600">
                Country Code: {kycData[2] !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? 'Encrypted ✓' : 'Not set'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Project Interaction Cards */}
      {verificationStatus && verificationStatus[0] && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Check Eligibility */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Check Project Eligibility</h3>
            
            <form onSubmit={handleCheckEligibility} className="space-y-4">
              <div>
                <label htmlFor="eligibilityProjectName" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name (Demo)
                </label>
                <input
                  type="text"
                  id="eligibilityProjectName"
                  value={eligibilityProjectName}
                  onChange={(e) => setEligibilityProjectName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter any project name for demo"
                />
              </div>
              
              <button
                type="submit"
                disabled={!eligibilityProjectName}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check Eligibility
              </button>
            </form>
            
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-600">
                This will check if you meet the project requirements without revealing your personal information.
              </p>
            </div>
          </div>

          {/* Generate Proof - Disabled */}
          <div className="bg-white shadow rounded-lg p-6 opacity-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Eligibility Proof</h3>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Feature Currently Disabled</strong>
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                The proof generation feature is not available in the current contract version. 
                You can still check eligibility for projects.
              </p>
            </div>
          </div>
        </div>
      )}

      {isConfirmed && (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Operation Completed Successfully
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Your transaction has been confirmed on the blockchain.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!verificationStatus?.[0] && verificationStatus !== undefined && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-8">
            <h3 className="mt-4 text-lg font-medium text-gray-900">Verification Pending</h3>
            <p className="mt-2 text-gray-500">
              Your KYC information has been submitted but is still pending verification by an authorized verifier.
              Once verified, you'll be able to check eligibility and generate proofs for projects.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}