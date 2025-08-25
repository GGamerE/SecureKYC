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
      <div className="card-tech p-8 slide-in-up">
        <div className="flex items-center space-x-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">KYC VERIFICATION</h2>
            <p className="text-cyan-400 text-sm">ACCESS CONTROL PROTOCOL</p>
          </div>
        </div>
        <div className="alert-tech alert-tech-warning">
          <div className="flex items-start space-x-3">
            <div>
              <h3 className="font-semibold mb-2 text-lg">ACCESS RESTRICTED</h3>
              <p className="text-sm opacity-90 leading-relaxed">
                You are not authorized to verify KYC data. Only authorized verifiers with proper cryptographic credentials can access this panel.
                Contact the system administrator to request verifier access.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card-tech p-8 slide-in-up glow-cyan">
      <div className="flex items-center space-x-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">KYC VERIFICATION PANEL</h2>
          <p className="text-cyan-400 text-sm">AUTHORIZED VALIDATOR ACCESS</p>
        </div>
      </div>
      
      <div className="alert-tech alert-tech-success mb-8">
        <div className="flex items-start space-x-3">
          <div>
            <h3 className="font-semibold mb-2 text-lg">AUTHORIZED VERIFIER</h3>
            <p className="text-sm opacity-90 leading-relaxed">
              You are authorized to verify KYC submissions. Enter a user's address below to check their KYC status and verify their encrypted information using FHE protocols.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-6">
        <div className="form-tech">
          <label htmlFor="targetAddress" className="form-label-tech">
            USER ADDRESS TO VERIFY
          </label>
          <input
            type="text"
            id="targetAddress"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            required
            className="form-input-tech"
            placeholder="ENTER ETHEREUM ADDRESS (0x...)"
          />
          {targetAddress && !isAddress(targetAddress) && (
            <p className="mt-3 text-sm text-red-400">Please enter a valid Ethereum address</p>
          )}
        </div>

        {verificationStatus && isAddress(targetAddress) && (
          <div className="card-tech p-6 border-cyan-500/30">
            <h3 className="text-lg font-semibold text-white mb-4">VERIFICATION STATUS</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-300">STATUS:</span>
                <span className={`text-sm font-semibold px-3 py-1 rounded ${
                  verificationStatus[0] 
                    ? 'bg-green-900/30 text-green-400 border border-green-500/30' 
                    : 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                }`}>
                  {verificationStatus[0] ? 'VERIFIED' : 'PENDING VERIFICATION'}
                </span>
              </div>
              {verificationStatus[0] && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-300">VERIFIED ON:</span>
                    <span className="text-sm text-white font-mono">
                      {new Date(Number(verificationStatus[1]) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-300">VERIFIED BY:</span>
                    <span className="text-sm text-cyan-400 font-mono break-all">
                      {verificationStatus[2]}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <button
            type="submit"
            disabled={
              isVerifying || 
              isConfirming || 
              !isAddress(targetAddress) ||
              (verificationStatus && verificationStatus[0])
            }
            className="btn-tech w-full glow-cyan pulse-glow"
            style={{ width: '100%' }}
          >
            {isVerifying || isConfirming ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                <span>{isVerifying ? 'PROCESSING VERIFICATION...' : 'CONFIRMING ON BLOCKCHAIN...'}</span>
              </div>
            ) : verificationStatus && verificationStatus[0] ? (
              <span>ALREADY VERIFIED</span>
            ) : (
              <span>VERIFY KYC DATA</span>
            )}
          </button>
        </div>

        {isConfirmed && (
          <div className="alert-tech alert-tech-success mt-6">
            <div className="flex items-start space-x-3">
              <div>
                <h3 className="font-semibold mb-2 text-lg">KYC VERIFICATION SUCCESSFUL</h3>
                <p className="text-sm opacity-90 leading-relaxed">
                  The user's encrypted KYC information has been successfully verified and recorded on the blockchain.
                  All verification data remains encrypted using FHE protocols.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}