CREATE TABLE IF NOT EXISTS drops (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    monster TEXT NOT NULL,
    map TEXT NOT NULL,
    gold INTEGER NOT NULL,
    items INTEGER NOT NULL,
    player TEXT NOT NULL,
    userkey INTEGER NOT NULL,
    time DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS monster_idx ON drops(monster);
CREATE INDEX IF NOT EXISTS monster_map_idx ON drops(monster, map);
CREATE INDEX IF NOT EXISTS time_idx ON drops(time);

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    dropid INTEGER NOT NULL,
    FOREIGN KEY(dropid) REFERENCES drops(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS item_idx ON items(name);

CREATE TABLE IF NOT EXISTS upgrades (
    id INTEGER PRIMARY KEY,
    item TEXT NOT NULL,
    level INTEGER NOT NULL,
    scroll TEXT NOT NULL,
    offering TEXT,
    success BOOLEAN NOT NULL,
    userkey INTEGER NOT NULL,
    time DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS level_idx on upgrades(level);

--ALTER TABLE drops ADD player TEXT DEFAULT '__unknown';

CREATE INDEX IF NOT EXISTS player_idx ON drops(player);
CREATE INDEX IF NOT EXISTS player_monster_idx ON drops(player, monster);
