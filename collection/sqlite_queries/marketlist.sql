SELECT
    I.name item,
    M.level level,
    COUNT(I.name) avaliable,
    AVG(price) AS avgprice
FROM market M
INNER JOIN market_items I ON M.id = I.marketid
WHERE M.time > strftime('%s', 'now') - 300
GROUP BY I.name, M.level