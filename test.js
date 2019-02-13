const fetcher = require("./data/DataFetcher");

async function main() {
    try {
        fetcher.getData();
    } catch (e) {
        console.error(e);
    }
}

main();