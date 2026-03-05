-- Reset works table to fix incorrect dedup groupings (v1.1.2)
-- Books with "Series: Title" naming (e.g. "Eden's Gate: The Reborn" vs
-- "Eden's Gate: The Spartan") were incorrectly merged into the same work
-- because subtitle stripping collapsed them to the same base title.
-- The works table auto-rebuilds from dedup logic as users browse.
DELETE FROM work_asins;
DELETE FROM works;
