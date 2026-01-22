'use client'

import { useState } from 'react'
import { Coffee } from 'lucide-react'
import { startBreakWithNotes } from '@/app/(dashboard)/app/break-actions'

export function BreakButton({ breakType, sessionId, remainingCount }: { breakType: string, sessionId: string, remainingCount: number }) {
  const [showForm, setShowForm] = useState(false)
  const [notes, setNotes] = useState('')

  if (showForm) {
    return (
      <form action={startBreakWithNotes} className="p-4 bg-card border rounded-xl space-y-3">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="breakType" value={breakType} />
        
        <div>
          <label className="text-sm font-medium block mb-2 capitalize">Start {breakType} Break</label>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add remarks (optional)..."
            className="w-full p-2 border rounded-lg bg-background text-sm h-20 resize-none"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 py-2 px-4 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            Start Break
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false)
              setNotes('')
            }}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:opacity-90 transition-opacity shadow-md capitalize"
    >
      <Coffee size={20} />
      {breakType} Break
      <span className="text-xs opacity-75">({remainingCount} left)</span>
    </button>
  )
}
