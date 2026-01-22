'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

export function SubmitButton({ children, className = '', loadingText = 'Loading...' }: { children: React.ReactNode, className?: string, loadingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} ${pending ? 'opacity-70 cursor-not-allowed' : ''} transition-opacity`}
    >
      {pending ? (
        <span className="flex items-center gap-2 justify-center">
          <Loader2 size={16} className="animate-spin" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
