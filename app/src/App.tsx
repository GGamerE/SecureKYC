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
              <div className="icon-tech" style={{ width: '2.5rem', height: '2.5rem' }}>
                <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '1.25rem', height: '1.25rem' }}>
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">SECURE<span className="text-cyan-400">KYC</span></h1>
                <p className="text-gray-400 text-sm">BLOCKCHAIN IDENTITY VERIFICATION</p>
              </div>
            </div>
            <div className="slide-in-up">
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {isConnected && (
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* FHE Initialization Section */}
            {!fheInstance && (
              <div className="alert-tech alert-tech-warning mb-6 slide-in-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="icon-tech-warning" style={{ width: '2rem', height: '2rem' }}>
                      <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '1rem', height: '1rem' }}>
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">FHE INITIALIZATION REQUIRED</h3>
                      <p className="text-sm mt-1 opacity-90">
                        Initialize Fully Homomorphic Encryption to access encrypted features
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleInitFHE}
                    disabled={isInitializingFHE}
                    className="btn-tech pulse-glow"
                  >
                    {isInitializingFHE ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        INITIALIZING...
                      </div>
                    ) : (
                      'INITIALIZE FHE'
                    )}
                  </button>
                </div>
              </div>
            )}

            {fheInstance && (
              <div className="alert-tech alert-tech-success mb-6 slide-in-up">
                <div className="flex items-center space-x-4">
                  <div className="icon-tech-success" style={{ width: '2rem', height: '2rem' }}>
                    <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '1rem', height: '1rem' }}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">FHE SYSTEM ONLINE</p>
                    <p className="text-sm mt-1 opacity-90">All encrypted features are now active and secure</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="nav-tech mb-8 slide-in-up glow-cyan">
              <button
                onClick={() => setActiveTab('submit')}
                className={`tab-tech ${activeTab === 'submit' ? 'active' : ''}`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>SUBMIT</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('verify')}
                className={`tab-tech ${activeTab === 'verify' ? 'active' : ''}`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
                  </svg>
                  <span>VERIFY</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`tab-tech ${activeTab === 'projects' ? 'active' : ''}`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>PROJECTS</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`tab-tech ${activeTab === 'dashboard' ? 'active' : ''}`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span>DASHBOARD</span>
                </div>
              </button>
            </div>

            {/* Tab Content */}
            <div className="slide-in-up">
              {activeTab === 'submit' && (
                fheInstance ? (
                  <KYCSubmissionForm fheInstance={fheInstance} userAddress={address} />
                ) : (
                  <div className="card-tech p-8 text-center">
                    <div className="icon-tech mx-auto mb-4">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-gray-300 text-lg">INITIALIZE FHE TO ACCESS SECURE SUBMISSION</p>
                  </div>
                )
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
                    <div className="icon-tech mx-auto mb-4">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    </div>
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
              <div className="icon-tech mx-auto mb-8 float-animation" style={{ width: '4rem', height: '4rem' }}>
                <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '2rem', height: '2rem' }}>
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              
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
                  <div className="icon-tech mx-auto mb-4">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-white mb-3 text-lg">QUANTUM-RESISTANT</h3>
                  <p className="text-gray-300 text-sm">Military-grade FHE encryption protects your data against future quantum attacks</p>
                </div>
                
                <div className="card-tech p-6 text-center">
                  <div className="icon-tech mx-auto mb-4">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-white mb-3 text-lg">ZERO-KNOWLEDGE</h3>
                  <p className="text-gray-300 text-sm">Verification without revealing sensitive personal information to third parties</p>
                </div>
                
                <div className="card-tech p-6 text-center">
                  <div className="icon-tech mx-auto mb-4">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                  </div>
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
