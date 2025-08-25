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
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Requirements</h2>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Access Restricted
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You are not authorized to set project requirements. Only authorized verifiers can access this panel.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project lookup section for non-verifiers */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lookup Project Requirements</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="lookupProjectName" className="block text-sm font-medium text-gray-700 mb-2">
                Project Address
              </label>
              <input
                type="text"
                id="lookupProjectName"
                value={lookupProjectName}
                onChange={(e) => setLookupProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter project address (0x...)"
              />
            </div>

            {projectRequirements && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-3">Project Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Project Active:</span>
                    <span className="text-sm text-gray-900">{projectRequirements ? 'Yes' : 'No'}</span>
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
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-green-800 mb-2">
            Project Requirements Set Successfully!
          </h3>
          <p className="text-green-600 mb-4">
            The requirements for "{projectName}" have been saved on-chain.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Set Another Project
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Set Project Requirements</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Project Requirements */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Project</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter project name"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Simplified Project Setup</h4>
              <p className="text-sm text-blue-700">
                In this demo, creating a project simply registers your address as a project verifier. 
                Eligibility requirements will be specified when users check their eligibility.
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || isConfirming || !projectName}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || isConfirming ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isSubmitting ? 'Creating Project...' : 'Confirming Transaction...'}
                  </div>
                ) : (
                  'Create Project'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Lookup Project Requirements */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lookup Existing Project</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="lookupProjectName" className="block text-sm font-medium text-gray-700 mb-2">
                Project Address
              </label>
              <input
                type="text"
                id="lookupProjectName"
                value={lookupProjectName}
                onChange={(e) => setLookupProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter project address (0x...)"
              />
            </div>

            {projectRequirements && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-3">Project Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Project Active:</span>
                    <span className="text-sm text-gray-900">{projectRequirements ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            )}

            {isValidAddress && !projectRequirements && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">No active project found at this address.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}