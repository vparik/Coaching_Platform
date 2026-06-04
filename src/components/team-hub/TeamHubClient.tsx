'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, Eye, Trash2 } from 'lucide-react'

interface Message {
  id: string
  content: string
  created_at: string
  view_count: number
  total_players: number
  profiles?: { name: string } | null
  coach_id: string
}

export default function TeamHubClient({
  messages, teamId, userId,
}: {
  messages: Message[]
  teamId: string | null | undefined
  userId: string
}) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !teamId) return
    setSending(true)

    await supabase.from('team_messages').insert({
      team_id: teamId,
      coach_id: userId,
      content: content.trim(),
    })

    setContent('')
    setSending(false)
    router.refresh()
  }

  async function deleteMessage(id: string) {
    if (!confirm('Delete this message?')) return
    await supabase.from('team_messages').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Team Hub</h1>
        <p className="text-gray-400 text-sm mt-0.5">Communicate with your squad</p>
      </div>

      {/* Compose */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <form onSubmit={sendMessage} className="space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Post a message, announcement, or tactical note to your squad..."
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Send size={15} />
              {sending ? 'Posting...' : 'Post to Squad'}
            </button>
          </div>
        </form>
      </div>

      {/* Messages */}
      {messages.length === 0 && (
        <div className="text-center py-12 text-gray-500">No messages yet. Post something to your squad.</div>
      )}

      <div className="space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-white leading-relaxed flex-1">{msg.content}</p>
              {msg.coach_id === userId && (
                <button onClick={() => deleteMessage(msg.id)} className="text-gray-600 hover:text-red-400 shrink-0">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                {new Date(msg.created_at).toLocaleDateString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Eye size={13} />
                <span>
                  Seen by{' '}
                  <span className={msg.view_count === msg.total_players && msg.total_players > 0 ? 'text-green-400 font-medium' : 'text-white font-medium'}>
                    {msg.view_count}/{msg.total_players}
                  </span>
                  {' '}players
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
