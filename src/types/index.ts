export type UserRole = 'coach' | 'player'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  team_id: string | null
  created_at: string
}

export interface Team {
  id: string
  name: string
  coach_id: string
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  position: string
  age: number | null
  preferred_foot: 'left' | 'right' | 'both' | null
  nationality: string | null
  private_notes: string | null
  availability_status: 'available' | 'injured' | 'absent' | 'unknown'
  created_at: string
}

export interface TrainingSession {
  id: string
  team_id: string
  date: string
  time: string | null
  objective: string
  intensity: 'low' | 'medium' | 'high'
  phase: 'recovery' | 'prep' | 'development'
  notes: string | null
  created_at: string
}

export interface Match {
  id: string
  team_id: string
  opponent: string
  date: string
  venue: 'home' | 'away' | 'neutral'
  result: string | null
  notes: string | null
  prep_done: boolean
  created_at: string
}

export interface MatchPrep {
  id: string
  match_id: string
  opponent_formation: string | null
  opponent_style: string | null
  opponent_strengths: string | null
  opponent_weaknesses: string | null
  key_players: string | null
  set_piece_tendencies: string | null
  match_brief: string | null
  created_at: string
}

export interface PlayerRating {
  id: string
  match_id: string
  player_id: string
  rating: number
  notes: string | null
}

export interface TeamMessage {
  id: string
  team_id: string
  coach_id: string
  content: string
  media_url: string | null
  created_at: string
  view_count?: number
  total_players?: number
  profile?: { name: string }
}

export interface MessageView {
  id: string
  message_id: string
  player_id: string
  viewed_at: string
}

export interface PlayerPos {
  id: string
  label: string
  x: number
  y: number
}

export interface Tactic {
  id: string
  team_id: string
  name: string
  formation_our: string | null
  formation_opp: string | null
  positions: {
    our: PlayerPos[]
    opp: PlayerPos[]
  }
  created_at: string
}
