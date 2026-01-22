'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'

export function LoadingButton({ 
  children, 
  className = '', 
  loadingText = 'Loading...',
  action,
  onClick
}: { 
  children: React.ReactNode, 
  className?: string, 
  loadingText?: string,
  action?: () => void | Promise<void>,
  onClick?: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    if (onClick) onClick()
    
    if (action) {
      startTransition(async () => {
        await action()
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }

  const pending = isPending || isLoading

  return (
    <button
      type="submit"
      onClick={handleClick}
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
