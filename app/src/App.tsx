import { useState } from 'react'
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
  const [isInitializingFHE, setIsInitializingFHE] = useState(false)

  const handleInitFHE = async () => {
    setIsInitializingFHE(true)
    try {
      const instance = await initFHE()
      setFheInstance(instance)
    } catch (error) {
      console.error('Failed to initialize FHE:', error)
    } finally {
      setIsInitializingFHE(false)
    }
  }

  return (
    <div className="bg-tech-dark min-h-screen">
      <header className="header-tech">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4 slide-in-up">
              <div>
                <h1 className="text-2xl font-bold text-white">SECURE<span className="text-cyan-400">KYC</span></h1>
                <p className="text-gray-400 text-sm">BLOCKCHAIN IDENTITY VERIFICATION</p>
              </div>
            </div>
            
            {/* FHE Status in Header */}
            {isConnected && (
              <div className="flex items-center space-x-4">
                {!fheInstance ? (
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm text-yellow-400 font-semibold">FHE REQUIRED</p>
                      <p className="text-xs text-gray-400">Initialize encryption</p>
                    </div>
                    <button
                      onClick={handleInitFHE}
                      disabled={isInitializingFHE}
                      className="btn-tech text-sm px-3 py-1.5"
                    >
                      {isInitializingFHE ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          <span className="text-xs">INIT...</span>
                        </div>
                      ) : (
                        <span className="text-xs">INIT FHE</span>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-sm text-green-400 font-semibold">Zama ONLINE</p>
                    <p className="text-xs text-gray-400">Encryption ready</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="slide-in-up">
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {isConnected && (
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Tab Navigation */}
            <div className="nav-tech mb-8 slide-in-up glow-cyan">
              <button
                onClick={() => setActiveTab('submit')}
                className={`tab-tech ${activeTab === 'submit' ? 'active' : ''}`}
              >
                <span>SUBMIT</span>
              </button>
              <button
                onClick={() => setActiveTab('verify')}
                className={`tab-tech ${activeTab === 'verify' ? 'active' : ''}`}
              >
                <span>VERIFY</span>
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`tab-tech ${activeTab === 'projects' ? 'active' : ''}`}
              >
                <span>PROJECTS</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`tab-tech ${activeTab === 'dashboard' ? 'active' : ''}`}
              >
                <span>DASHBOARD</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="slide-in-up">
              {activeTab === 'submit' && (
                <div className="space-y-6">
                  {fheInstance ? (
                    <KYCSubmissionForm fheInstance={fheInstance} userAddress={address} />
                  ) : (
                    <div className="card-tech p-8 text-center">
                      <p className="text-gray-300 text-lg">INITIALIZE FHE TO ACCESS SECURE SUBMISSION</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'verify' && (
                <KYCVerificationPanel userAddress={address} />
              )}
              {activeTab === 'projects' && (
                <ProjectRequirementsPanel userAddress={address} />
              )}
              {activeTab === 'dashboard' && (
                fheInstance ? (
                  <UserDashboard fheInstance={fheInstance} userAddress={address} />
                ) : (
                  <div className="card-tech p-8 text-center">
                    <p className="text-gray-300 text-lg">INITIALIZE FHE TO ACCESS DASHBOARD</p>
                  </div>
                )
              )}
            </div>
          </div>
        </main>
      )}

      {!isConnected && (
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="max-w-4xl mx-auto text-center">
              
              <div className="slide-in-up">
                <h1 className="text-4xl font-bold text-white mb-2">
                  SECURE<span className="text-cyan-400">KYC</span>
                </h1>
                <h2 className="text-xl text-cyan-400 mb-6 font-medium">
                  BLOCKCHAIN IDENTITY VERIFICATION SYSTEM
                </h2>
                <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
                  Advanced privacy-preserving KYC verification using Fully Homomorphic Encryption. 
                  Your identity data remains encrypted at all times while enabling secure verification.
                </p>
              </div>
              
              <div className="feature-grid-tech slide-in-up">
                <div className="card-tech p-6 text-center">
                  <h3 className="font-semibold text-white mb-3 text-lg">QUANTUM-RESISTANT</h3>
                  <p className="text-gray-300 text-sm">Military-grade FHE encryption protects your data against future quantum attacks</p>
                </div>
                
                <div className="card-tech p-6 text-center">
                  <h3 className="font-semibold text-white mb-3 text-lg">ZERO-KNOWLEDGE</h3>
                  <p className="text-gray-300 text-sm">Verification without revealing sensitive personal information to third parties</p>
                </div>
                
                <div className="card-tech p-6 text-center">
                  <h3 className="font-semibold text-white mb-3 text-lg">SELF-SOVEREIGN</h3>
                  <p className="text-gray-300 text-sm">Maintain complete control over your identity data with blockchain ownership</p>
                </div>
              </div>
              
              <div className="mt-12 slide-in-up">
                <p className="text-gray-400 text-lg font-medium mb-4">
                  CONNECT WALLET TO ACCESS SECURE VERIFICATION
                </p>
                <div className="inline-block px-8 py-2 border border-cyan-400 rounded-lg">
                  <span className="text-cyan-400 font-mono text-sm pulse-glow">/// WAITING FOR CONNECTION ///</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

export default App
