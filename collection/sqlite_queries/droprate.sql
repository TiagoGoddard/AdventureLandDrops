SELECT
    D.monster monster,
    D.map map, 
    I.name item,
    COUNT(I.name) drops,
    T.kills kills,
    COUNT(I.name)*100.0 / T.kills as rate
FROM (SELECT monster, map, COUNT(monster) kills FROM drops GROUP BY monster, map) T
INNER JOIN drops D ON T.monster = D.monster AND T.map = D.map
INNER JOIN items I ON D.id = I.dropid
GROUP BY D.monster, D.map, I.name
