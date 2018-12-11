CREATE TABLE IF NOT EXISTS market (
    id INTEGER PRIMARY KEY,
    type varchar(64) NOT NULL,
    price INTEGER NOT NULL,
    map varchar(64) NOT NULL,
    server varchar(64) NOT NULL,
    items INTEGER NOT NULL,
    level INTEGER NULL,
    player varchar(64) NOT NULL,
    userkey INTEGER NOT NULL,
    version INTEGER NOT NULL,
    time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS market_items (
    id INTEGER PRIMARY KEY,
    name varchar(64) NOT NULL,
    marketid INTEGER NOT NULL,
    FOREIGN KEY(marketid) REFERENCES market(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS drops (
    id INTEGER PRIMARY KEY,
    type varchar(64) NOT NULL,
    monster varchar(64) NOT NULL,
    map varchar(64) NOT NULL,
    gold INTEGER NOT NULL,
    items INTEGER NOT NULL,
    player varchar(64) NOT NULL,
    userkey INTEGER NOT NULL,
    version INTEGER NOT NULL,
    time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    name varchar(64) NOT NULL,
    dropid INTEGER NOT NULL,
    FOREIGN KEY(dropid) REFERENCES drops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS upgrades (
    id INTEGER PRIMARY KEY,
    item varchar(64) NOT NULL,
    level INTEGER NOT NULL,
    scroll varchar(64) NOT NULL,
    offering varchar(64),
    success BOOLEAN NOT NULL,
    userkey INTEGER NOT NULL,
    time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS compounds (
    id INTEGER PRIMARY KEY,
    item varchar(64) NOT NULL,
    level INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    userkey INTEGER NOT NULL,
    time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY,
    item varchar(64) NOT NULL,
    result varchar(64) NOT NULL,
    amount INTEGER NOT NULL,
    userkey INTEGER NOT NULL,
    time DATETIME NOT NULL,
    level INTEGER NULL
);