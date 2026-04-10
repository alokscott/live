'use client'

import { useState } from 'react'
import { createClient, Deposit } from '@/lib/supabase'
import {
  calculateCurrentValue,
  calculateInterestEarned,
  getCompleteWeeks,
  getFirstWeekStart,
  formatCurrency,
  formatDate,
  getDayOfWeek,
} from '@/lib/interest'

interface DepositTableProps {
  deposits: Deposit[]
  onRefresh: () => void
}

export default function DepositTable({ deposits, onRefresh }: DepositTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const supabase = createClient()

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deposit?')) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('deposits')
        .delete()
        .eq('id', id)

      if (error) throw error
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete deposit')
    } finally {
      setDeletingId(null)
    }
  }

  const handleClose = async (deposit: Deposit) => {
    const depositDate = new Date(deposit.deposit_date + 'T00:00:00')
    const interest = calculateInterestEarned(deposit.amount, depositDate)
    const currentValue = calculateCurrentValue(deposit.amount, depositDate)
    const weeks = getCompleteWeeks(depositDate)

    const confirmed = confirm(
      `Close this position?\n\n` +
      `Principal: ${formatCurrency(deposit.amount)}\n` +
      `Interest Earned: ${formatCurrency(interest)}\n` +
      `Total Payout: ${formatCurrency(currentValue)}\n` +
      `Weeks Elapsed: ${weeks}\n\n` +
      `This will freeze the interest at the current amount.`
    )
    if (!confirmed) return

    setClosingId(deposit.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const today = new Date()
      const closureDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      const { error } = await supabase
        .from('closures')
        .insert({
          deposit_id: deposit.id,
          user_id: user.id,
          principal: deposit.amount,
          interest_redeemed: Math.round(interest * 100) / 100,
          total_payout: Math.round(currentValue * 100) / 100,
          weeks_elapsed: weeks,
          closure_date: closureDate,
        })

      if (error) throw error
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to close position')
    } finally {
      setClosingId(null)
    }
  }

  // Calculate totals
  const totals = deposits.reduce(
    (acc, deposit) => {
      const depositDate = new Date(deposit.deposit_date + 'T00:00:00')
      const currentValue = calculateCurrentValue(deposit.amount, depositDate)
      const interest = calculateInterestEarned(deposit.amount, depositDate)
      
      return {
        principal: acc.principal + deposit.amount,
        currentValue: acc.currentValue + currentValue,
        interest: acc.interest + interest,
      }
    },
    { principal: 0, currentValue: 0, interest: 0 }
  )

  if (deposits.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-card-hover rounded-full mb-4">
          <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">No Deposits Yet</h3>
        <p className="text-muted text-sm">Add your first deposit to start tracking.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-muted mb-1">Total Deposited</p>
          <p className="text-2xl font-bold font-mono">{formatCurrency(totals.principal)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted mb-1">Current Value</p>
          <p className="text-2xl font-bold font-mono text-accent">{formatCurrency(totals.currentValue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted mb-1">Total Interest</p>
          <p className="text-2xl font-bold font-mono">
            <span className="text-accent">+{formatCurrency(totals.interest)}</span>
          </p>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Deposit Date</th>
                <th>Day</th>
                <th>Principal</th>
                <th>Week 1 Starts</th>
                <th>Weeks Earned</th>
                <th>Interest</th>
                <th>Current Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit, index) => {
                const depositDate = new Date(deposit.deposit_date + 'T00:00:00')
                const currentValue = calculateCurrentValue(deposit.amount, depositDate)
                const interest = calculateInterestEarned(deposit.amount, depositDate)
                const weeks = getCompleteWeeks(depositDate)
                const firstWeekStart = getFirstWeekStart(depositDate)

                return (
                  <tr 
                    key={deposit.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
                  >
                    <td className="font-mono text-sm">{formatDate(depositDate)}</td>
                    <td className="text-sm text-muted">{getDayOfWeek(depositDate)}</td>
                    <td className="font-mono">{formatCurrency(deposit.amount)}</td>
                    <td className="text-sm text-muted">{formatDate(firstWeekStart)}</td>
                    <td>
                      <span className={`badge ${weeks > 0 ? 'badge-success' : 'badge-danger'}`}>
                        {weeks} {weeks === 1 ? 'week' : 'weeks'}
                      </span>
                    </td>
                    <td className="font-mono text-accent">
                      +{formatCurrency(interest)}
                    </td>
                    <td className="font-mono font-semibold">{formatCurrency(currentValue)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleClose(deposit)}
                          disabled={closingId === deposit.id}
                          className="p-2 text-muted hover:text-accent transition-colors rounded-lg hover:bg-accent-muted disabled:opacity-50"
                          title="Close position"
                        >
                          {closingId === deposit.id ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(deposit.id)}
                          disabled={deletingId === deposit.id}
                          className="p-2 text-muted hover:text-danger transition-colors rounded-lg hover:bg-danger-muted disabled:opacity-50"
                          title="Delete deposit"
                        >
                          {deletingId === deposit.id ? (
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
