'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Dumbbell, Target, MessageSquare, ClipboardList, ChessKnight } from 'lucide-react'
import { UserRole } from '@/types'

const coachNav = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/squad', label: 'Squad', icon: Users },
  { href: '/match-prep', label: 'Prep', icon: Target },
  { href: '/team-hub', label: 'Hub', icon: MessageSquare },
  { href: '/matches', label: 'Log', icon: ClipboardList },
  { href: '/tactics', label: 'Tactics', icon: ChessKnight },
]

const playerNav = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/training', label: 'Training', icon: Dumbbell },
  { href: '/match-prep', label: 'Prep', icon: Target },
  { href: '/team-hub', label: 'Hub', icon: MessageSquare },
  { href: '/tactics', label: 'Tactics', icon: ChessKnight },
]

export default function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const nav = role === 'player' ? playerNav : coachNav

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 text-xs gap-1 transition-colors ${
              active ? 'text-green-400' : 'text-gray-500'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
