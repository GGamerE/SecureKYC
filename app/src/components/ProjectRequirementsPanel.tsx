import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { SecureKYCABI } from '../contracts/SecureKYC'
import { CONTRACT_ADDRESS } from '../config/wagmi'

interface ProjectRequirementsPanelProps {
  userAddress: `0x${string}` | undefined
}

export default function ProjectRequirementsPanel({ userAddress }: ProjectRequirementsPanelProps) {
  const [projectName, setProjectName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lookupProjectName, setLookupProjectName] = useState('')

  // Check if current user is an authorized verifier
  const { data: isAuthorizedVerifier } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SecureKYCABI,
    functionName: 'authorizedVerifiers',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  })

  // Get project requirements for lookup (using project address instead of name)
  // For demo purposes, we'll use the lookup name as an address format if it's valid
  const isValidAddress = lookupProjectName?.startsWith('0x') && lookupProjectName.length === 42
  const { data: projectRequirements } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SecureKYCABI,
    functionName: 'projectRequirements',
    args: isValidAddress ? [lookupProjectName as `0x${string}`] : undefined,
    query: { enabled: !!isValidAddress }
  })

  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userAddress || !projectName) return

    try {
      setIsSubmitting(true)
      
      // Use the user's address as the project address for this simplified example
      // In a real application, you would use a dedicated project address
      const projectAddress = userAddress
      
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: SecureKYCABI,
        functionName: 'setProjectRequirements',
        args: [projectAddress]
      })
    } catch (error) {
      console.error('Error setting project requirements:', error)
    } finally {
      setIsSubmitting(false)
    }
  }


  if (!isAuthorizedVerifier) {
    return (
      <div className="card-tech p-8 slide-in-up">
        <div className="flex items-center space-x-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">PROJECT REQUIREMENTS</h2>
            <p className="text-cyan-400 text-sm">PROJECT MANAGEMENT PROTOCOL</p>
          </div>
        </div>
        
        <div className="alert-tech alert-tech-warning mb-8">
          <div className="flex items-start space-x-3">
            <div>
              <h3 className="font-semibold mb-2 text-lg">ACCESS RESTRICTED</h3>
              <p className="text-sm opacity-90 leading-relaxed">
                You are not authorized to set project requirements. Only authorized verifiers with proper cryptographic credentials can create projects.
              </p>
            </div>
          </div>
        </div>

        {/* Project lookup section for non-verifiers */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-6">LOOKUP PROJECT REQUIREMENTS</h3>
          <div className="space-y-6">
            <div className="form-tech">
              <label htmlFor="lookupProjectName" className="form-label-tech">
                PROJECT ADDRESS
              </label>
              <input
                type="text"
                id="lookupProjectName"
                value={lookupProjectName}
                onChange={(e) => setLookupProjectName(e.target.value)}
                className="form-input-tech"
                placeholder="ENTER PROJECT ADDRESS (0x...)"
              />
            </div>

            {projectRequirements && (
              <div className="card-tech p-6 border-cyan-500/30">
                <h4 className="text-lg font-semibold text-white mb-4">PROJECT STATUS</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-300">PROJECT ACTIVE:</span>
                    <span className="text-sm font-semibold px-3 py-1 rounded bg-green-900/30 text-green-400 border border-green-500/30">
                      {projectRequirements ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isConfirmed) {
    return (
      <div className="card-tech p-8 slide-in-up">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            PROJECT CREATION SUCCESSFUL
          </h3>
          <p className="text-gray-300 mb-6 leading-relaxed">
            The project "{projectName}" has been successfully registered on the blockchain.
            Your project is now active and can receive KYC eligibility verification requests.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-tech-success"
          >
            CREATE ANOTHER PROJECT
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card-tech p-8 slide-in-up glow-cyan">
      <div className="flex items-center space-x-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">PROJECT MANAGEMENT</h2>
          <p className="text-cyan-400 text-sm">DECENTRALIZED PROJECT REGISTRY</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Project Requirements */}
        <div className="card-tech p-6 border-cyan-500/30">
          <h3 className="text-lg font-semibold text-white mb-6">CREATE NEW PROJECT</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-tech">
              <label htmlFor="projectName" className="form-label-tech">
                PROJECT NAME
              </label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="form-input-tech"
                placeholder="ENTER PROJECT IDENTIFIER"
              />
            </div>

            <div className="alert-tech alert-tech-info">
              <div className="flex items-start space-x-3">
                <div>
                  <h4 className="font-semibold mb-2">SIMPLIFIED PROJECT SETUP</h4>
                  <p className="text-sm opacity-90 leading-relaxed">
                    Creating a project registers your address as a project verifier on the blockchain. 
                    KYC eligibility requirements will be specified during user verification requests using encrypted protocols.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={isSubmitting || isConfirming || !projectName}
                className="btn-tech w-full glow-cyan pulse-glow"
                style={{ width: '100%' }}
              >
                {isSubmitting || isConfirming ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    <span>{isSubmitting ? 'CREATING PROJECT...' : 'CONFIRMING ON BLOCKCHAIN...'}</span>
                  </div>
                ) : (
                  <span>INITIALIZE PROJECT</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Lookup Project Requirements */}
        <div className="card-tech p-6 border-gray-500/30">
          <h3 className="text-lg font-semibold text-white mb-6">LOOKUP EXISTING PROJECT</h3>
          
          <div className="space-y-6">
            <div className="form-tech">
              <label htmlFor="lookupProjectName" className="form-label-tech">
                PROJECT ADDRESS
              </label>
              <input
                type="text"
                id="lookupProjectName"
                value={lookupProjectName}
                onChange={(e) => setLookupProjectName(e.target.value)}
                className="form-input-tech"
                placeholder="ENTER PROJECT ADDRESS (0x...)"
              />
            </div>

            {projectRequirements && (
              <div className="card-tech p-4 border-green-500/30">
                <h4 className="text-md font-semibold text-white mb-3">PROJECT STATUS</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-300">PROJECT ACTIVE:</span>
                    <span className="text-sm font-semibold px-3 py-1 rounded bg-green-900/30 text-green-400 border border-green-500/30">
                      {projectRequirements ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isValidAddress && !projectRequirements && (
              <div className="card-tech p-4 border-gray-500/30">
                <p className="text-sm text-gray-400">No active project found at this address.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}