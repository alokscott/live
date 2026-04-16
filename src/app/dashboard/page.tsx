'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient, Deposit, Closure } from '@/lib/supabase'
import { exportToPdf } from '@/lib/exportPdf'
import AuthGuard from '@/components/AuthGuard'
import DepositForm from '@/components/DepositForm'
import DepositTable from '@/components/DepositTable'
import ClosedPositionsTable, { ClosedPosition } from '@/components/ClosedPositionsTable'

function DashboardContent() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [closures, setClosures] = useState<Closure[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const [depositsResult, closuresResult] = await Promise.all([
        supabase.from('deposits').select('*').order('deposit_date', { ascending: false }),
        supabase.from('closures').select('*').order('closure_date', { ascending: false }),
      ])

      if (depositsResult.error) throw depositsResult.error
      if (closuresResult.error) throw closuresResult.error

      setDeposits(depositsResult.data || [])
      setClosures(closuresResult.data || [])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }

    getUser()
    fetchData()
  }, [fetchData, supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Derive active deposits (exclude closed ones)
  const closedDepositIds = new Set(closures.map(c => c.deposit_id))
  const activeDeposits = deposits.filter(d => !closedDepositIds.has(d.id))

  // Build closed positions by joining closures with deposit dates
  const depositMap = new Map(deposits.map(d => [d.id, d]))
  const closedPositions: ClosedPosition[] = closures.map(closure => {
    const deposit = depositMap.get(closure.deposit_id)
    return {
      closureId: closure.id,
      depositDate: deposit?.deposit_date ?? closure.closure_date,
      closureDate: closure.closure_date,
      principal: closure.principal,
      interestRedeemed: closure.interest_redeemed,
      totalPayout: closure.total_payout,
      weeksElapsed: closure.weeks_elapsed,
    }
  })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <Image
                  src="/Inessa_logo.svg"
                  alt="Innesa"
                  width={40}
                  height={40}
                  priority
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Innesa Holdings</h1>
                <p className="text-xs text-muted">Fund Tracker</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-muted hidden sm:block">{userEmail}</span>
              <button
                onClick={() => exportToPdf(activeDeposits, closedPositions)}
                disabled={activeDeposits.length === 0 && closedPositions.length === 0}
                className="btn btn-primary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={handleSignOut}
                className="btn btn-secondary text-sm py-2 px-4"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Deposit Form */}
          <div className="lg:col-span-1">
            <DepositForm onSuccess={fetchData} />
          </div>

          {/* Main Content - Deposits Table */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="card flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-muted">Loading deposits...</p>
                </div>
              </div>
            ) : (
              <DepositTable deposits={activeDeposits} onRefresh={fetchData} />
            )}
          </div>
        </div>

        {/* Closed Positions */}
        {closedPositions.length > 0 && (
          <div className="mt-8">
            <ClosedPositionsTable positions={closedPositions} />
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 text-xs text-muted">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span>Live calculations</span>
            </div>
            <span>•</span>
            <span>0.5% weekly compound interest</span>
            <span>•</span>
            <span>Interest starts after first complete week</span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
