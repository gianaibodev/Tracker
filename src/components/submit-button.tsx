'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

export function SubmitButton({ children, className = '', loadingText = 'Loading...' }: { children: React.ReactNode, className?: string, loadingText?: string }) {
  const { pending } = useFormStatus()
  const [clicked, setClicked] = useState(false)
  
  const isPending = pending || clicked

  return (
    <button
      type="submit"
      disabled={isPending}
      onClick={() => setClicked(true)}
      className={`${className} ${isPending ? 'opacity-70 cursor-not-allowed' : ''} transition-opacity`}
    >
      {isPending ? (
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
