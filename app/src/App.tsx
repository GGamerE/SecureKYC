import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import KYCSubmissionForm from './components/KYCSubmissionForm'
import KYCVerificationPanel from './components/KYCVerificationPanel'
import ProjectRequirementsPanel from './components/ProjectRequirementsPanel'
import UserDashboard from './components/UserDashboard'
import { initFHE } from './config/fhe'
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle'
import './App.css'

function App() {
  const { address, isConnected } = useAccount()
  const [fheInstance, setFheInstance] = useState<FhevmInstance | null>(null)
  const [activeTab, setActiveTab] = useState<'submit' | 'verify' | 'projects' | 'dashboard'>('submit')

  useEffect(() => {
    const initializeFHE = async () => {
      try {
        const instance = await initFHE()
        setFheInstance(instance)
      } catch (error) {
        console.error('Failed to initialize FHE:', error)
      }
    }

    if (isConnected) {
      initializeFHE()
    }
  }, [isConnected])

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">SecureKYC</h1>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {isConnected && fheInstance && (
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('submit')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'submit'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Submit KYC
                </button>
                <button
                  onClick={() => setActiveTab('verify')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'verify'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Verify KYC
                </button>
                <button
                  onClick={() => setActiveTab('projects')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'projects'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Project Requirements
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'dashboard'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Dashboard
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'submit' && (
                <KYCSubmissionForm fheInstance={fheInstance} userAddress={address} />
              )}
              {activeTab === 'verify' && (
                <KYCVerificationPanel userAddress={address} />
              )}
              {activeTab === 'projects' && (
                <ProjectRequirementsPanel userAddress={address} />
              )}
              {activeTab === 'dashboard' && (
                <UserDashboard fheInstance={fheInstance} userAddress={address} />
              )}
            </div>
          </div>
        </main>
      )}

      {!isConnected && (
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to SecureKYC
            </h2>
            <p className="text-gray-600 mb-8">
              A privacy-preserving KYC verification system using Fully Homomorphic Encryption
            </p>
            <p className="text-gray-500">
              Please connect your wallet to get started
            </p>
          </div>
        </main>
      )}
    </div>
  )
}

export default App
