'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Dumbbell, Target, MessageSquare, ClipboardList, ChessKnight, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/types'

const coachNav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/squad', label: 'Squad', icon: Users },
  { href: '/training', label: 'Training', icon: Dumbbell },
  { href: '/match-prep', label: 'Match Prep', icon: Target },
  { href: '/team-hub', label: 'Team Hub', icon: MessageSquare },
  { href: '/matches', label: 'Match Log', icon: ClipboardList },
  { href: '/tactics', label: 'Tactics', icon: ChessKnight },
]

const playerNav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/squad', label: 'My Profile', icon: Users },
  { href: '/training', label: 'Training', icon: Dumbbell },
  { href: '/match-prep', label: 'Match Prep', icon: Target },
  { href: '/team-hub', label: 'Team Hub', icon: MessageSquare },
  { href: '/matches', label: 'Match Log', icon: ClipboardList },
  { href: '/tactics', label: 'Tactics', icon: ChessKnight },
]

interface SidebarProfile {
  name: string
  role?: UserRole
  teams?: { name: string } | null
}

export default function Sidebar({ profile }: { profile: SidebarProfile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const nav = profile?.role === 'player' ? playerNav : coachNav

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 px-4 py-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">⚽</span>
          <span className="font-bold text-white text-lg">Coach Platform</span>
        </div>
        {profile && (
          <div className="mt-3 px-2">
            <p className="text-sm font-medium text-white">{profile.name}</p>
            {profile.teams && (
              <p className="text-xs text-gray-400">{profile.teams.name}</p>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={signOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </aside>
  )
}
