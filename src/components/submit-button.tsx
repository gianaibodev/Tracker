'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({ children, className = '', loadingText = 'Loading...' }: { children: React.ReactNode, className?: string, loadingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} ${pending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {pending ? loadingText : children}
    </button>
  )
}
