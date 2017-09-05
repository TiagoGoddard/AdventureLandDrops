SELECT exchanges.item, ifnull(exchanges.level, 0) as level, exchanges.result, COUNT(*) AS seen, AVG(amount) AS avg_amount, S.total FROM exchanges
LEFT OUTER JOIN (SELECT item, ifnull(level, 0) as level, COUNT(*) AS total FROM exchanges GROUP BY item, level) S
ON exchanges.item=S.item and ifnull(exchanges.level, 0)=S.level
WHERE exchanges.result <> 'gold' GROUP BY exchanges.item, exchanges.result

UNION ALL

SELECT exchanges.item, ifnull(exchanges.level, 0) as level, exchanges.result, COUNT(*) AS seen, amount, S.total FROM exchanges
LEFT OUTER JOIN (SELECT item, ifnull(level, 0) as level, COUNT(*) AS total FROM exchanges GROUP BY item, level) S
ON exchanges.item=S.item and ifnull(exchanges.level, 0)=S.level
WHERE exchanges.result == 'gold' GROUP BY exchanges.item, exchanges.amount;