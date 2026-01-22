'use client'

import { Coffee } from 'lucide-react'
import { startBreak } from '@/app/(dashboard)/app/actions'
import { SubmitButton } from '@/components/submit-button'

export function BreakButton({ breakType, sessionId }: { breakType: string, sessionId: string }) {
  return (
    <form action={startBreak.bind(null, sessionId, breakType)}>
      <SubmitButton
        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold hover:opacity-90 transition-opacity shadow-md capitalize w-full justify-center"
        loadingText="Starting..."
      >
        <Coffee size={20} />
        {breakType} Break
      </SubmitButton>
    </form>
  )
}
