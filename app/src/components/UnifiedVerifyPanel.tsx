import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { SecureKYCABI } from '../contracts/SecureKYC'
import { CONTRACT_ADDRESS } from '../config/wagmi'
import { isAddress } from 'viem'

interface UnifiedVerifyPanelProps {
  userAddress: `0x${string}` | undefined
}

export default function UnifiedVerifyPanel({ userAddress }: UnifiedVerifyPanelProps) {
  const [activeSection, setActiveSection] = useState<'kyc' | 'project'>('kyc')
  
  // KYC Verification state
  const [targetAddress, setTargetAddress] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  
  // Project Management state
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

  // Get verification status of target address
  const { data: verificationStatus, refetch: refetchStatus } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SecureKYCABI,
    functionName: 'getVerificationStatus',
    args: isAddress(targetAddress) ? [targetAddress as `0x${string}`] : undefined,
    query: { enabled: isAddress(targetAddress) }
  })

  // Get project requirements for lookup
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
  
  // Refetch status when transaction is confirmed
  if (isConfirmed && activeSection === 'kyc') {
    refetchStatus()
  }

  const handleVerifyKYC = async (e: React.FormEvent) => {
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userAddress || !projectName) return

    try {
      setIsSubmitting(true)
      
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
      <div className="card-tech p-6 slide-in-up">
        <div className="flex items-center space-x-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-2">VERIFICATION CENTER</h2>
            <p className="text-cyan-400 text-sm">KYC & PROJECT MANAGEMENT PROTOCOL</p>
          </div>
        </div>
        
        <div className="alert-tech alert-tech-warning mb-6">
          <div className="flex items-start space-x-3">
            <div>
              <h3 className="font-semibold mb-2 text-sm">ACCESS RESTRICTED</h3>
              <p className="text-sm opacity-90 leading-relaxed">
                You are not authorized to access verification functions. Only authorized verifiers with proper cryptographic credentials can verify KYC data and manage projects.
                Contact the system administrator to request verifier access.
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

  // Project creation success state
  if (isConfirmed && activeSection === 'project') {
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
            onClick={() => {
              setActiveSection('project')
              setProjectName('')
              window.location.reload()
            }} 
            className="btn-tech-success"
          >
            CREATE ANOTHER PROJECT
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card-tech p-6 slide-in-up glow-cyan">
      <div className="flex items-center space-x-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white mb-2">VERIFICATION CENTER</h2>
          <p className="text-cyan-400 text-sm">AUTHORIZED VALIDATOR ACCESS</p>
        </div>
      </div>
      
      <div className="alert-tech alert-tech-success mb-6">
        <div className="flex items-start space-x-3">
          <div>
            <h3 className="font-semibold mb-2 text-sm">AUTHORIZED VERIFIER</h3>
            <p className="text-sm opacity-90 leading-relaxed">
              You are authorized to verify KYC submissions and manage projects. Use the tabs below to switch between KYC verification and project management functions.
            </p>
          </div>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="nav-tech mb-6 slide-in-up">
        <button
          onClick={() => setActiveSection('kyc')}
          className={`tab-tech ${activeSection === 'kyc' ? 'active' : ''}`}
        >
          <span>KYC VERIFICATION</span>
        </button>
        <button
          onClick={() => setActiveSection('project')}
          className={`tab-tech ${activeSection === 'project' ? 'active' : ''}`}
        >
          <span>PROJECT MANAGEMENT</span>
        </button>
      </div>

      {/* KYC Verification Section */}
      {activeSection === 'kyc' && (
        <div className="space-y-6">
          <form onSubmit={handleVerifyKYC} className="space-y-6">
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

            {isConfirmed && activeSection === 'kyc' && (
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
      )}

      {/* Project Management Section */}
      {activeSection === 'project' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Project Requirements */}
          <div className="card-tech p-4 border-cyan-500/30">
            <h3 className="text-sm font-semibold text-white mb-4">AUTHORIZE PROJECT</h3>
            
            <form onSubmit={handleCreateProject} className="space-y-6">
              <div className="form-tech">
                <label htmlFor="projectName" className="form-label-tech">
                  PROJECT ADDRESS
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
                    <span>AUTHORIZE PROJECT</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Lookup Project Requirements */}
          <div className="card-tech p-4 border-gray-500/30">
            <h3 className="text-sm font-semibold text-white mb-4">LOOKUP EXISTING PROJECT</h3>
            
            <div className="space-y-6">
              <div className="form-tech">
                <label htmlFor="lookupProjectNameManagement" className="form-label-tech">
                  PROJECT ADDRESS
                </label>
                <input
                  type="text"
                  id="lookupProjectNameManagement"
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
      )}
    </div>
  )
}