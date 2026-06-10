# Memory Index

- [Supabase ambiguous join bug](feedback_supabase_join.md) — Never use `select('*, relatedTable(*)')` on profiles; causes silent null return due to circular FK
- [Drill Board feature](project_drill_board.md) — `/training/board?id=`, phase 1+2 built, needs `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS board jsonb` migration
- [Player access feature](project-player-access.md) — Full player signup/claim/view flow; SQL gotchas, what's working, what's pending
