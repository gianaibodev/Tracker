'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function SubmitButton({ children, className = '', loadingText = 'Loading...' }: { children: React.ReactNode, className?: string, loadingText?: string }) {
  const { pending } = useFormStatus()
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Reset button state when pending changes
  useEffect(() => {
    if (!pending && buttonRef.current) {
      buttonRef.current.blur()
    }
  }, [pending])

  return (
    <button
      ref={buttonRef}
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
