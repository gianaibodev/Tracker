'use client'

import { useEffect, useState } from 'react'

export function FormattedDate({ date, options }: { date: string | Date, options?: Intl.DateTimeFormatOptions }) {
  const [formatted, setFormatted] = useState<string>('')

  useEffect(() => {
    setFormatted(new Date(date).toLocaleDateString(undefined, options))
  }, [date, options])

  return <>{formatted}</>
}

export function FormattedTime({ date, options, className }: { date: string | Date, options?: Intl.DateTimeFormatOptions, className?: string }) {
  const [formatted, setFormatted] = useState<string>('')

  useEffect(() => {
    setFormatted(new Date(date).toLocaleTimeString([], options).toUpperCase())
  }, [date, options])

  return <span className={className}>{formatted}</span>
}
