import { useState } from 'react'
import { passportToAddress, generatePassportAddresses } from '../utils/passportUtils'

export default function PassportConversionDemo() {
  const [passportNumber, setPassportNumber] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const basicAddress = passportNumber ? passportToAddress(passportNumber) : null
  const addresses = passportNumber ? generatePassportAddresses(passportNumber) : null

  return (
    <div className="card-tech p-4 slide-in-up glow-cyan">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white mb-2">PASSPORT TO ADDRESS CONVERTER</h2>
          <p className="text-cyan-400 text-sm">CRYPTOGRAPHIC IDENTITY TRANSFORMATION</p>
        </div>
      </div>

      <div className="alert-tech alert-tech-info mb-4">
        <div>
          <h3 className="font-semibold mb-2 text-sm">CONVERSION MECHANISM</h3>
          <p className="text-xs opacity-90 leading-relaxed">
            Passport numbers are converted to EVM addresses using SHA3/Keccak-256 hashing. 
            This creates a deterministic but irreversible transformation for secure storage.
          </p>
        </div>
      </div>

      <div className="form-tech mb-4">
        <label htmlFor="passportDemo" className="form-label-tech">
          PASSPORT NUMBER
        </label>
        <input
          type="text"
          id="passportDemo"
          value={passportNumber}
          onChange={(e) => setPassportNumber(e.target.value)}
          className="form-input-tech"
          placeholder="Enter passport number for conversion demo"
        />
      </div>

      {basicAddress && (
        <div className="space-y-4">
          <div className="p-3 bg-gray-800 rounded border border-cyan-500/30">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-cyan-400 font-semibold">BASIC CONVERSION</div>
            </div>
            <div className="text-xs text-gray-300 font-mono break-all mb-1">{basicAddress}</div>
            <div className="text-xs text-gray-500">
              This is the address that will be encrypted and stored on-chain
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn-tech-outline text-xs px-3 py-1"
            >
              {showAdvanced ? 'HIDE' : 'SHOW'} ADVANCED CONVERSIONS
            </button>
          </div>

          {showAdvanced && addresses && (
            <div className="space-y-3">
              <div className="text-sm text-cyan-400 font-semibold">ADVANCED CONVERSIONS WITH SALTS:</div>
              
              <div className="grid gap-2">
                <div className="p-2 bg-gray-800/50 rounded border border-gray-600">
                  <div className="text-xs text-yellow-400 mb-1">WITH USER SALT:</div>
                  <div className="text-xs text-gray-300 font-mono break-all">{addresses.withUserSalt}</div>
                </div>
                
                <div className="p-2 bg-gray-800/50 rounded border border-gray-600">
                  <div className="text-xs text-yellow-400 mb-1">WITH SYSTEM SALT:</div>
                  <div className="text-xs text-gray-300 font-mono break-all">{addresses.withSystemSalt}</div>
                </div>
                
                <div className="p-2 bg-gray-800/50 rounded border border-gray-600">
                  <div className="text-xs text-yellow-400 mb-1">WITH TIMESTAMP SALT:</div>
                  <div className="text-xs text-gray-300 font-mono break-all">{addresses.withTimestamp}</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 p-2 bg-gray-900/50 rounded">
                <strong>Note:</strong> Salted versions provide additional security against rainbow table attacks 
                but are not used in the current implementation for consistency.
              </div>
            </div>
          )}

          <div className="p-3 bg-red-900/20 rounded border border-red-500/30">
            <div className="text-xs text-red-400 font-semibold mb-2">⚠️ SECURITY NOTICE</div>
            <div className="text-xs text-red-300 leading-relaxed">
              This is a one-way transformation. The original passport number cannot be recovered from the address.
              The conversion is deterministic - the same passport number will always produce the same address.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}