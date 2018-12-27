var mysql = require("./collection/mysql");
var batch_size = 2500;

async function main() {
    console.log("Clearing existing data");
    await mysql.clearAllStatistics();

    console.log("Starting kills aggregation");
    var limits = await mysql.getLimits("kills");
    console.log("Progress:")
    console.log("0%----------------------------------------------------------------------------------------------------100%");
    var lastPercent = 0;
    var currentPercent = 0;
    process.stdout.write(' [');
    let size = limits[0].last - limits[0].first;
    for (let id = limits[0].first; id < limits[0].last; id += batch_size) {
        let result = await mysql.aggregateKills(id, id + batch_size);
        for (let row of result) {
            await mysql.updateKillStatistics(row.character_name, row.monster_name, row.map, row.monster_level, row.kills, row.total_gold);
        }
        currentPercent = Math.floor(id / size * 100);
        for (let i = 0; i < currentPercent - lastPercent; i++)
            process.stdout.write('#');
        lastPercent = currentPercent;
    }
    for (let i = 0; i < 100 - lastPercent; i++)
        process.stdout.write('#');
    process.stdout.write(']   \n')
    console.log("Finished kills aggregation")


    console.log("Starting drops aggregation");
    limits = await mysql.getLimits("drops");
    console.log("Progress:")
    console.log("0%----------------------------------------------------------------------------------------------------100%");
    lastPercent = 0;
    currentPercent = 0;
    process.stdout.write(' [');
    size = limits[0].last - limits[0].first;
    for (let id = limits[0].first; id < limits[0].last; id += batch_size) {
        let result = await mysql.aggregateDrops(id, id + batch_size);
        for (let row of result) {
            await mysql.updateDropStatistics(row.monster_name, row.item_name, row.map, row.monster_level, row.seen);
        }
        currentPercent = Math.floor(id / size * 100);
        for (let i = 0; i < currentPercent - lastPercent; i++)
            process.stdout.write('#');
        lastPercent = currentPercent;
    }
    for (let i = 0; i < 100 - lastPercent; i++)
        process.stdout.write('#');
    process.stdout.write(']   \n')
    console.log("Finished drops aggregation");

    console.log("Starting exchange aggregation");
    limits = await mysql.getLimits("exchanges");
    console.log("Progress:")
    console.log("0%----------------------------------------------------------------------------------------------------100%");
    lastPercent = 0;
    currentPercent = 0;
    process.stdout.write(' [');
    size = limits[0].last - limits[0].first;
    for (let id = limits[0].first; id < limits[0].last; id += batch_size) {
        let result = await mysql.aggregateExchanges(id, id + batch_size);
        for (let row of result) {
            await mysql.updateExchangeStatistics(row.item_name, row.item_level, row.result, row.amount, row.seen);
        }
        currentPercent = Math.floor(id / size * 100);
        for (let i = 0; i < currentPercent - lastPercent; i++)
            process.stdout.write('#');
        lastPercent = currentPercent;
    }
    for (let i = 0; i < 100 - lastPercent; i++)
        process.stdout.write('#');
    process.stdout.write(']   \n')
    console.log("Finished exchange aggregation");

    console.log("Starting compound aggregation");
    limits = await mysql.getLimits("compounds");
    console.log("Progress:")
    console.log("0%----------------------------------------------------------------------------------------------------100%");
    lastPercent = 0;
    currentPercent = 0;
    process.stdout.write(' [');
    size = limits[0].last - limits[0].first;
    for (let id = limits[0].first; id < limits[0].last; id += batch_size) {
        let result = await mysql.aggregateCompounds(id, id + batch_size);
        for (let row of result) {
            await mysql.updateCompoundsStatistics(row.item_name, row.item_level, row.total, row.success);
        }
        currentPercent = Math.floor(id / size * 100);
        for (let i = 0; i < currentPercent - lastPercent; i++)
            process.stdout.write('#');
        lastPercent = currentPercent;
    }
    for (let i = 0; i < 100 - lastPercent; i++)
        process.stdout.write('#');
    process.stdout.write(']   \n')
    console.log("Finished compound aggregation");

    console.log("Starting upgrade aggregation");
    limits = await mysql.getLimits("upgrades");
    console.log("Progress:")
    console.log("0%----------------------------------------------------------------------------------------------------100%");
    lastPercent = 0;
    currentPercent = 0;
    process.stdout.write(' [');
    size = limits[0].last - limits[0].first;
    for (let id = limits[0].first; id < limits[0].last; id += batch_size) {
        let result = await mysql.aggregateUpgrades(id, id + batch_size);
        for (let row of result) {
            await mysql.updateUpgradesStatistics(row.item_name, row.item_level, row.total, row.success);
        }
        currentPercent = Math.floor(id / size * 100);
        for (let i = 0; i < currentPercent - lastPercent; i++)
            process.stdout.write('#');
        lastPercent = currentPercent;
    }
    for (let i = 0; i < 100 - lastPercent; i++)
        process.stdout.write('#');
    process.stdout.write(']   \n')
    console.log("Finished upgrade aggregation");
    console.log("All statistics have been updated")
    process.exit();
}


main();