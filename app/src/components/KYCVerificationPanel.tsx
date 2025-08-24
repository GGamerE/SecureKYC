import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { SecureKYCABI } from '../contracts/SecureKYC'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import { isAddress } from 'viem'

interface KYCVerificationPanelProps {
  userAddress: `0x${string}` | undefined
}

export default function KYCVerificationPanel({ userAddress }: KYCVerificationPanelProps) {
  const [targetAddress, setTargetAddress] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Check if current user is an authorized verifier
  const { data: isAuthorizedVerifier } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SecureKYCABI,
    functionName: 'authorizedVerifiers',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  })

  // Get verification status of target address
  const { data: verificationStatus, refetch: refetchStatus } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SecureKYCABI,
    functionName: 'getVerificationStatus',
    args: isAddress(targetAddress) ? [targetAddress as `0x${string}`] : undefined,
    query: { enabled: isAddress(targetAddress) }
  })

  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })
  
  // Refetch status when transaction is confirmed
  if (isConfirmed) {
    refetchStatus()
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAddress(targetAddress) || !userAddress) return

    try {
      setIsVerifying(true)
      
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: SecureKYCABI,
        functionName: 'verifyKYC',
        args: [targetAddress as `0x${string}`]
      })
    } catch (error) {
      console.error('Error verifying KYC:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  if (!isAuthorizedVerifier) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">KYC Verification</h2>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Access Restricted
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You are not authorized to verify KYC data. Only authorized verifiers can access this panel.
                  Contact the system administrator to request verifier access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">KYC Verification Panel</h2>
      
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Authorized Verifier
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>
                You are authorized to verify KYC submissions. Enter a user's address below to check their KYC status and verify their information.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label htmlFor="targetAddress" className="block text-sm font-medium text-gray-700 mb-2">
            User Address to Verify
          </label>
          <input
            type="text"
            id="targetAddress"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="0x..."
          />
          {targetAddress && !isAddress(targetAddress) && (
            <p className="mt-1 text-sm text-red-600">Please enter a valid Ethereum address</p>
          )}
        </div>

        {verificationStatus && isAddress(targetAddress) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Verification Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <span className={`text-sm font-medium ${
                  verificationStatus[0] ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {verificationStatus[0] ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
              {verificationStatus[0] && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Verified On:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(Number(verificationStatus[1]) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Verified By:</span>
                    <span className="text-sm text-gray-900 font-mono">
                      {verificationStatus[2]}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={
              isVerifying || 
              isConfirming || 
              !isAddress(targetAddress) ||
              (verificationStatus && verificationStatus[0])
            }
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying || isConfirming ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isVerifying ? 'Verifying...' : 'Confirming Transaction...'}
              </div>
            ) : verificationStatus && verificationStatus[0] ? (
              'Already Verified'
            ) : (
              'Verify KYC'
            )}
          </button>
        </div>

        {isConfirmed && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  KYC Verified Successfully
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    The user's KYC information has been successfully verified and recorded on-chain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}