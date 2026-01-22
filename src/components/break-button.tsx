'use client'

import { Coffee, Loader2 } from 'lucide-react'
import { startBreak } from '@/app/(dashboard)/app/actions'
import { useState } from 'react'

export function BreakButton({ breakType, sessionId }: { breakType: string, sessionId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = () => {
    setIsLoading(true)
  }

  return (
    <form action={startBreak.bind(null, sessionId, breakType)} onClick={handleClick}>
      <button
        type="submit"
        disabled={isLoading}
        className={`flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:opacity-90 transition-opacity shadow-md capitalize w-full ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Starting Break...
          </>
        ) : (
          <>
            <Coffee size={20} />
            {breakType} Break
          </>
        )}
      </button>
    </form>
  )
}
