SELECT monster, COUNT(*) AS kills, player, map, SUM(gold) AS gold FROM (SELECT * FROM drops WHERE id > 0 AND id < 2500) GROUP BY monster, player, map;

SELECT
    kills.monster_name monster_name,
    kills.map map,
    drops.item_name item_name,
    COUNT(*) seen
FROM drops
INNER JOIN kills ON
    drops.kill_id = kills.id
GROUP BY
    kills.monster_name,
    kills.map,
    drops.item_name;

SELECT COUNT(*) AS total, SUM(success) AS success, item, level FROM upgrades GROUP BY item, level;

SELECT COUNT(*) AS total, SUM(success) AS success, item, level FROM compounds GROUP BY item, level

SELECT item AS item_name, 0 AS level, result, amount, COUNT(*) AS seen FROM exchanges GROUP BY item, result