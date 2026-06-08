import { PlayerPos } from '@/types'

// Coordinates are relative (0–1). Our team occupies the bottom half (y ~0.53–0.93).
// Opponent positions are the vertical mirror: y_opp = 1 − y_our.

export function mirror(positions: PlayerPos[]): PlayerPos[] {
  return positions.map(p => ({ ...p, y: parseFloat((1 - p.y).toFixed(4)) }))
}

export const OUR_FORMATIONS: Record<string, PlayerPos[]> = {
  '4-4-2': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RB',  label: 'RB',  x: 0.82, y: 0.79 },
    { id: 'CB1', label: 'CB',  x: 0.61, y: 0.79 },
    { id: 'CB2', label: 'CB',  x: 0.39, y: 0.79 },
    { id: 'LB',  label: 'LB',  x: 0.18, y: 0.79 },
    { id: 'RM',  label: 'RM',  x: 0.82, y: 0.65 },
    { id: 'CM1', label: 'CM',  x: 0.61, y: 0.65 },
    { id: 'CM2', label: 'CM',  x: 0.39, y: 0.65 },
    { id: 'LM',  label: 'LM',  x: 0.18, y: 0.65 },
    { id: 'ST1', label: 'ST',  x: 0.62, y: 0.55 },
    { id: 'ST2', label: 'ST',  x: 0.38, y: 0.55 },
  ],
  '4-3-3': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RB',  label: 'RB',  x: 0.82, y: 0.79 },
    { id: 'CB1', label: 'CB',  x: 0.61, y: 0.79 },
    { id: 'CB2', label: 'CB',  x: 0.39, y: 0.79 },
    { id: 'LB',  label: 'LB',  x: 0.18, y: 0.79 },
    { id: 'CM1', label: 'CM',  x: 0.74, y: 0.67 },
    { id: 'CM2', label: 'CM',  x: 0.50, y: 0.67 },
    { id: 'CM3', label: 'CM',  x: 0.26, y: 0.67 },
    { id: 'RW',  label: 'RW',  x: 0.82, y: 0.55 },
    { id: 'ST',  label: 'ST',  x: 0.50, y: 0.55 },
    { id: 'LW',  label: 'LW',  x: 0.18, y: 0.55 },
  ],
  '4-2-3-1': [
    { id: 'GK',   label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RB',   label: 'RB',  x: 0.82, y: 0.79 },
    { id: 'CB1',  label: 'CB',  x: 0.61, y: 0.79 },
    { id: 'CB2',  label: 'CB',  x: 0.39, y: 0.79 },
    { id: 'LB',   label: 'LB',  x: 0.18, y: 0.79 },
    { id: 'CDM1', label: 'CDM', x: 0.62, y: 0.70 },
    { id: 'CDM2', label: 'CDM', x: 0.38, y: 0.70 },
    { id: 'RAM',  label: 'CAM', x: 0.74, y: 0.61 },
    { id: 'CAM',  label: 'CAM', x: 0.50, y: 0.61 },
    { id: 'LAM',  label: 'CAM', x: 0.26, y: 0.61 },
    { id: 'ST',   label: 'ST',  x: 0.50, y: 0.53 },
  ],
  '3-5-2': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'CB1', label: 'CB',  x: 0.68, y: 0.80 },
    { id: 'CB2', label: 'CB',  x: 0.50, y: 0.80 },
    { id: 'CB3', label: 'CB',  x: 0.32, y: 0.80 },
    { id: 'RWB', label: 'RWB', x: 0.88, y: 0.68 },
    { id: 'CM1', label: 'CM',  x: 0.68, y: 0.65 },
    { id: 'CM2', label: 'CM',  x: 0.50, y: 0.65 },
    { id: 'CM3', label: 'CM',  x: 0.32, y: 0.65 },
    { id: 'LWB', label: 'LWB', x: 0.12, y: 0.68 },
    { id: 'ST1', label: 'ST',  x: 0.62, y: 0.55 },
    { id: 'ST2', label: 'ST',  x: 0.38, y: 0.55 },
  ],
  '5-3-2': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RWB', label: 'RWB', x: 0.88, y: 0.80 },
    { id: 'CB1', label: 'CB',  x: 0.71, y: 0.80 },
    { id: 'CB2', label: 'CB',  x: 0.50, y: 0.80 },
    { id: 'CB3', label: 'CB',  x: 0.29, y: 0.80 },
    { id: 'LWB', label: 'LWB', x: 0.12, y: 0.80 },
    { id: 'CM1', label: 'CM',  x: 0.68, y: 0.67 },
    { id: 'CM2', label: 'CM',  x: 0.50, y: 0.67 },
    { id: 'CM3', label: 'CM',  x: 0.32, y: 0.67 },
    { id: 'ST1', label: 'ST',  x: 0.62, y: 0.55 },
    { id: 'ST2', label: 'ST',  x: 0.38, y: 0.55 },
  ],
  '4-1-4-1': [
    { id: 'GK',  label: 'GK',  x: 0.50, y: 0.93 },
    { id: 'RB',  label: 'RB',  x: 0.82, y: 0.81 },
    { id: 'CB1', label: 'CB',  x: 0.61, y: 0.81 },
    { id: 'CB2', label: 'CB',  x: 0.39, y: 0.81 },
    { id: 'LB',  label: 'LB',  x: 0.18, y: 0.81 },
    { id: 'CDM', label: 'CDM', x: 0.50, y: 0.72 },
    { id: 'RM',  label: 'RM',  x: 0.82, y: 0.63 },
    { id: 'CM1', label: 'CM',  x: 0.61, y: 0.63 },
    { id: 'CM2', label: 'CM',  x: 0.39, y: 0.63 },
    { id: 'LM',  label: 'LM',  x: 0.18, y: 0.63 },
    { id: 'ST',  label: 'ST',  x: 0.50, y: 0.54 },
  ],
}

export const FORMATION_NAMES = Object.keys(OUR_FORMATIONS)
