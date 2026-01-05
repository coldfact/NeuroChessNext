-- build_puzzles_long.sql
-- Purpose:
--   Populate puzzles_long with up to 21,000 puzzles:
--     7 rating_bands × 6 move buckets (4,5,6,7,8,9+) × target 500 each
--   Phase A: best-first per (rating_band, move_bucket) using NbPlays DESC, Popularity DESC, PuzzleId ASC
--   Phase B: top up each rating_band to 3000 using random remaining puzzles
--
-- Run:
--   sqlite3 your.db < build_puzzles_long.sql
--
-- Assumptions:
--   - Source table: puzzles
--   - puzzles has columns:
--       PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
--       Themes, GameUrl, OpeningTags, rating_band, move_count
--   - move_count is integer-like
--   - rating_band is already populated in puzzles (e.g., '0000-0800', etc.)

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

------------------------------------------------------------
-- 1) Create puzzles_long (drop + recreate for clean rebuild)
------------------------------------------------------------
DROP TABLE IF EXISTS puzzles_long;

CREATE TABLE puzzles_long (
  PuzzleId          TEXT PRIMARY KEY,
  FEN               TEXT,
  Moves             TEXT,
  Rating            INTEGER,
  RatingDeviation   INTEGER,
  Popularity        INTEGER,
  NbPlays           INTEGER,
  Themes            TEXT,
  GameUrl           TEXT,
  OpeningTags       TEXT,
  rating_band       TEXT,
  move_count        INTEGER
);

------------------------------------------------------------
-- 2) Indexes (performance + safety)
------------------------------------------------------------
-- Redundant with PRIMARY KEY but kept explicit for clarity / tooling
CREATE UNIQUE INDEX IF NOT EXISTS idx_puzzles_long_puzzleid
ON puzzles_long(PuzzleId);

-- Helps Phase A partition/filtering and Phase B band scans
CREATE INDEX IF NOT EXISTS idx_puzzles_band_move
ON puzzles(rating_band, move_count);

-- Helps ordering scans (SQLite may not fully leverage for window ORDER BY, but still useful)
CREATE INDEX IF NOT EXISTS idx_puzzles_quality
ON puzzles(NbPlays, Popularity);

------------------------------------------------------------
-- 3) Phase A: Fill per (rating_band, move_bucket) up to 500
--    Ordering: NbPlays DESC, Popularity DESC, PuzzleId ASC
------------------------------------------------------------
BEGIN;

WITH ranked AS (
  SELECT
    p.*,
    CASE
      WHEN p.move_count >= 9 THEN '9+'
      ELSE CAST(p.move_count AS TEXT)
    END AS move_bucket,
    ROW_NUMBER() OVER (
      PARTITION BY
        p.rating_band,
        CASE
          WHEN p.move_count >= 9 THEN '9+'
          ELSE CAST(p.move_count AS TEXT)
        END
      ORDER BY
        p.NbPlays DESC,
        p.Popularity DESC,
        p.PuzzleId ASC
    ) AS rn
  FROM puzzles p
  WHERE p.move_count >= 4
    AND p.move_count IS NOT NULL
)
INSERT OR IGNORE INTO puzzles_long (
  PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
  Themes, GameUrl, OpeningTags, rating_band, move_count
)
SELECT
  PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
  Themes, GameUrl, OpeningTags, rating_band, move_count
FROM ranked
WHERE rn <= 500
  AND move_bucket IN ('9+','8','7','6','5','4');

COMMIT;

------------------------------------------------------------
-- 4) Phase B: Top up each rating_band to 3000 (pure random)
--    Randomly pick from remaining puzzles not already inserted
------------------------------------------------------------
BEGIN;

WITH band_need AS (
  SELECT
    rb.rating_band,
    3000 - COALESCE(pl.cnt, 0) AS need
  FROM (SELECT DISTINCT rating_band FROM puzzles) rb
  LEFT JOIN (
    SELECT rating_band, COUNT(*) AS cnt
    FROM puzzles_long
    GROUP BY rating_band
  ) pl
  ON pl.rating_band = rb.rating_band
  WHERE (3000 - COALESCE(pl.cnt, 0)) > 0
),
candidates AS (
  SELECT
    p.*,
    ROW_NUMBER() OVER (
      PARTITION BY p.rating_band
      ORDER BY RANDOM()
    ) AS rn
  FROM puzzles p
  WHERE p.move_count >= 4
    AND p.move_count IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM puzzles_long pl
      WHERE pl.PuzzleId = p.PuzzleId
    )
),
picked AS (
  SELECT c.*
  FROM candidates c
  JOIN band_need bn
    ON bn.rating_band = c.rating_band
  WHERE c.rn <= bn.need
)
INSERT OR IGNORE INTO puzzles_long (
  PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
  Themes, GameUrl, OpeningTags, rating_band, move_count
)
SELECT
  PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
  Themes, GameUrl, OpeningTags, rating_band, move_count
FROM picked;

COMMIT;

------------------------------------------------------------
-- 5) Sanity checks (prints results)
------------------------------------------------------------

-- Total rows in puzzles_long (target: 21000)
SELECT COUNT(*) AS total_puzzles_long
FROM puzzles_long;

-- Total per rating_band (target: 3000 each; expect 7 rows)
SELECT rating_band, COUNT(*) AS cnt
FROM puzzles_long
GROUP BY rating_band
ORDER BY rating_band;

-- Distribution per move_bucket within each rating_band (expect some buckets > 500 due to Phase B)
SELECT
  rating_band,
  CASE WHEN move_count >= 9 THEN '9+' ELSE CAST(move_count AS TEXT) END AS move_bucket,
  COUNT(*) AS cnt
FROM puzzles_long
GROUP BY rating_band, move_bucket
ORDER BY rating_band, move_bucket;

-- Confirm no duplicates
SELECT
  COUNT(*) AS total_rows,
  COUNT(DISTINCT PuzzleId) AS distinct_puzzleids
FROM puzzles_long;

-- Optional: show Phase A shortfalls (after final fill this is mostly informational)
-- Uncomment if you want it:
-- WITH phase_a_counts AS (
--   SELECT
--     rating_band,
--     CASE WHEN move_count >= 9 THEN '9+' ELSE CAST(move_count AS TEXT) END AS move_bucket,
--     COUNT(*) AS got
--   FROM puzzles_long
--   GROUP BY rating_band, move_bucket
-- )
-- SELECT
--   rating_band,
--   move_bucket,
--   got,
--   (500 - got) AS shortfall
-- FROM phase_a_counts
-- WHERE move_bucket IN ('9+','8','7','6','5','4')
--   AND got < 500
-- ORDER BY rating_band,
--   CASE move_bucket
--     WHEN '9+' THEN 6
--     WHEN '8'  THEN 5
--     WHEN '7'  THEN 4
--     WHEN '6'  THEN 3
--     WHEN '5'  THEN 2
--     WHEN '4'  THEN 1
--     ELSE 0
--   END DESC;
