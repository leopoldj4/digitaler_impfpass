import { ReactNode } from 'react'

export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50">
      {children}
    </div>
  )
}
