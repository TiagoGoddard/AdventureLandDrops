const mysql = require("./collection/mysql");

async function main() {
    try {
        console.log(await mysql.getCompoundsByItemName("dexamulet"));
    } catch (e) {
        console.error(e);
    }
}

main();