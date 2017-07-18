SELECT DISTINCT
    I.name item,
    M.level level,
    M.price price,
    M.player player,
    M.server server,
    M.map map,
    M.time
FROM market M
INNER JOIN market_items I ON M.id = I.marketid
WHERE M.time > strftime('%s', 'now') - 300
ORDER BY I.name, M.level, M.price, M.time