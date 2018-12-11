CREATE TABLE IF NOT EXISTS market (
    id INTEGER PRIMARY KEY,
    type varchar(64) NOT NULL,
    price INTEGER NOT NULL,
    map varchar(64) NOT NULL,
    server varchar(64) NOT NULL,
    items INTEGER NOT NULL,
    level INTEGER NULL,
    player varchar(64) NOT NULL,
    userkey varchar(64) NOT NULL,
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
    userkey varchar(64) NOT NULL,
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
    userkey varchar(64) NOT NULL,
    time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS compounds (
    id INTEGER PRIMARY KEY,
    item varchar(64) NOT NULL,
    level INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    userkey varchar(64) NOT NULL,
    time DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY,
    item varchar(64) NOT NULL,
    result varchar(64) NOT NULL,
    amount INTEGER NOT NULL,
    userkey varchar(64) NOT NULL,
    time DATETIME NOT NULL,
    level INTEGER NULL
);

CREATE TABLE `drop_statistics` (
  `monster_name` varchar(64) NOT NULL,
  `item_name` varchar(64) NOT NULL,
  `map` varchar(64) NOT NULL,
  `level` int(11) NOT NULL,
  `seen` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `drop_statistics`
  ADD PRIMARY KEY (`monster_name`, `item_name`, `map`, `level`);

CREATE TABLE `api_keys` (
  `id` int(11) NOT NULL,
  `Player` varchar(64) NOT NULL,
  `api_key` varchar(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `api_keys`
  ADD PRIMARY KEY (`id`);

CREATE TABLE `character_statistics` (
  `character_name` varchar(64) NOT NULL,
  `monster_name` varchar(64) NOT NULL,
  `kills` bigint(20) NOT NULL,
  `total_gold` bigint(20) NOT NULL,
  `map` varchar(64) NOT NULL,
  `level` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `character_statistics`
  ADD PRIMARY KEY (`character_name`,`monster_name`,`map`,`level`);


CREATE TABLE `compound_statistics` (
  `item_name` varchar(64) NOT NULL,
  `level` int(11) NOT NULL,
  `total` int(11) NOT NULL,
  `success` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `compound_statistics`
  ADD PRIMARY KEY (`item_name`,`level`);


CREATE TABLE `exchange_statistics` (
  `item_name` varchar(64) NOT NULL,
  `level` int(11) NOT NULL,
  `result` varchar(64) NOT NULL,
  `amount` int(11) NOT NULL,
  `seen` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `exchange_statistics`
  ADD PRIMARY KEY (`item_name`,`level`,`result`,`amount`);

CREATE TABLE `upgrade_statistics` (
  `item_name` varchar(64) NOT NULL,
  `level` int(11) NOT NULL,
  `total` bigint(20) NOT NULL,
  `success` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

ALTER TABLE `upgrade_statistics`
  ADD PRIMARY KEY (`item_name`,`level`);

ALTER TABLE `api_keys`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
