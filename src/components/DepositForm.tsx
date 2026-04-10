'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getDayOfWeek } from '@/lib/interest'

interface DepositFormProps {
  onSuccess: () => void
}

export default function DepositForm({ onSuccess }: DepositFormProps) {
  const [amount, setAmount] = useState('')
  const [depositDate, setDepositDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('You must be logged in')
      }

      const parsedAmount = parseFloat(amount)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid amount greater than 0')
      }

      const { error: insertError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: parsedAmount,
          deposit_date: depositDate,
        })

      if (insertError) throw insertError

      setAmount('')
      setDepositDate('')
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add deposit')
    } finally {
      setLoading(false)
    }
  }

  const selectedDayOfWeek = depositDate ? getDayOfWeek(depositDate + 'T00:00:00') : null

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add New Deposit
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-muted mb-2">
            Amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input pl-8"
              placeholder="10,000.00"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="deposit_date" className="block text-sm font-medium text-muted mb-2">
            Deployment Date
          </label>
          <input
            id="deposit_date"
            type="date"
            value={depositDate}
            onChange={(e) => setDepositDate(e.target.value)}
            className="input"
            required
          />
          {selectedDayOfWeek && (
            <p className="mt-2 text-sm text-muted">
              Selected: <span className="text-accent">{selectedDayOfWeek}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-danger-muted border border-danger/30 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Adding...
            </span>
          ) : (
            'Add Deposit'
          )}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-accent-muted/50 border border-accent/20 rounded-lg">
        <h3 className="text-sm font-medium text-accent mb-2">Interest Calculation</h3>
        <ul className="text-xs text-muted space-y-1">
          <li>• 0.5% compound interest per complete week</li>
          <li>• Week 1 starts from the coming Monday after deposit</li>
          <li>• 0.5% is awarded on the Monday after each complete week</li>
          <li>• Example: Deposit on Tuesday → Week 1 starts next Monday → First 0.5% awarded the Monday after</li>
        </ul>
      </div>
    </div>
  )
}
