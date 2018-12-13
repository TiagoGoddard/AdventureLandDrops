const mysql = require("./collection/mysql");

async function main() {
    try {
        await mysql.insertExchange("Penis Sword of Death",1337,"Penis Sword of Love",1337,"235667sdfg234567");
    } catch (e) {
        console.error(e)
    }
}

main();