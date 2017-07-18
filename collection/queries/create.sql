CREATE TABLE IF NOT EXISTS market (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    price INTEGER NOT NULL,
    map TEXT NOT NULL,
    server TEXT NOT NULL,
    items INTEGER NOT NULL,
    level INTEGER NULL,
    player TEXT NOT NULL,
    userkey INTEGER NOT NULL,
    version INTEGER NOT NULL,
    time DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS market_player_idx ON market(player);
CREATE INDEX IF NOT EXISTS items_level_price_idx ON market(type, level, price);
CREATE INDEX IF NOT EXISTS player_items_idx ON market(player, type);
CREATE INDEX IF NOT EXISTS market_time_idx ON market(time);

CREATE TABLE IF NOT EXISTS market_items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    marketid INTEGER NOT NULL,
    FOREIGN KEY(marketid) REFERENCES market(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS market_item_idx ON market_items(name);

CREATE TABLE IF NOT EXISTS drops (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    monster TEXT NOT NULL,
    map TEXT NOT NULL,
    gold INTEGER NOT NULL,
    items INTEGER NOT NULL,
    player TEXT NOT NULL,
    userkey INTEGER NOT NULL,
    version INTEGER NOT NULL,
    time DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS monster_idx ON drops(monster);
CREATE INDEX IF NOT EXISTS monster_map_idx ON drops(monster, map);
CREATE INDEX IF NOT EXISTS time_idx ON drops(time);
CREATE INDEX IF NOT EXISTS player_idx ON drops(player);
CREATE INDEX IF NOT EXISTS player_monster_idx ON drops(player, monster);

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

CREATE TABLE IF NOT EXISTS compounds (
    id INTEGER PRIMARY KEY,
    item TEXT NOT NULL,
    level INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    userkey INTEGER NOT NULL,
    time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY,
    item TEXT NOT NULL,
    result TEXT NOT NULL,
    amount INTEGER NOT NULL,
    userkey INTEGER NOT NULL,
    time DATETIME NOT NULL,
    level INTEGER NULL
);