'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/types'

export default function SignupPage() {
  const [role, setRole] = useState<UserRole>('coach')
  const [name, setName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinedTeamName, setJoinedTeamName] = useState<string | null>(null)
  const [joinCodeError, setJoinCodeError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function validateJoinCode(code: string) {
    const trimmed = code.trim()
    if (!trimmed) {
      setJoinedTeamName(null)
      setJoinCodeError('')
      return
    }
    const { data, error: rpcError } = await supabase.rpc('lookup_team_by_join_code', { code: trimmed })
    if (rpcError || !data?.length) {
      setJoinedTeamName(null)
      setJoinCodeError('Team not found — check the code and try again')
    } else {
      setJoinedTeamName(data[0].name)
      setJoinCodeError('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (role === 'player' && !joinedTeamName) {
      setError('Enter a valid team code before continuing')
      setLoading(false)
      return
    }

    const metadata = role === 'coach'
      ? { name, team_name: teamName, role: 'coach' }
      : { name, join_code: joinCode.trim().toUpperCase(), role: 'player' }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      if (role === 'player') {
        router.push('/auth/claim')
      } else {
        router.push('/')
        router.refresh()
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="text-2xl font-bold text-white">Coach Platform</h1>
          <p className="text-gray-400 text-sm mt-1">Create your account</p>
        </div>

        <div className="flex bg-gray-900 rounded-lg p-1 mb-6 border border-gray-800">
          {(['coach', 'player'] as UserRole[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r); setError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                role === r ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {r === 'coach' ? "I'm a Coach" : "I'm a Player"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
              placeholder={role === 'coach' ? 'Coach name' : 'Your name'}
            />
          </div>

          {role === 'coach' ? (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
                placeholder="Your team name"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Team Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onBlur={() => validateJoinCode(joinCode)}
                required
                className={`w-full bg-gray-900 border text-white rounded-lg px-4 py-3 focus:outline-none transition-colors tracking-widest font-mono ${
                  joinCodeError
                    ? 'border-red-500 focus:border-red-500'
                    : joinedTeamName
                      ? 'border-green-500'
                      : 'border-gray-800 focus:border-green-500'
                }`}
                placeholder="e.g. ALFA7749"
              />
              {joinedTeamName && (
                <p className="text-green-400 text-xs mt-1.5">Joining: {joinedTeamName}</p>
              )}
              {joinCodeError && (
                <p className="text-red-400 text-xs mt-1.5">{joinCodeError}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
              placeholder={role === 'coach' ? 'coach@team.com' : 'you@email.com'}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-green-400 hover:text-green-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
