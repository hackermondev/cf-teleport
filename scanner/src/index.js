const { Masscan } = require('masscan');
function icmpFindOpenNetworks(range) {
    return new Promise(async (resolve, reject) => {
        const masscan = new Masscan({
            range,
            ports: '0',
            ping: true,
            wait: 2,
        });
        
        const result = [];

        masscan.once('error', reject);
        masscan.on('status', (status) => result.push(status));

        await masscan.scan();
        resolve(result);
    })    
}


const origins = require('./data/origins.json');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

(async () => {
    const ranges = [];

    for (let i = 0; i < origins.length; i++) {
        const { query } = origins[i];
        const scan = (await icmpFindOpenNetworks(`${query}/24`))
            .filter(s => s.data.status == 'open').map(s => s.ip);
        
        ranges.push({ ip: query, open: scan });
        console.log(`Finished scan ${i + 1}/${origins.length}`);
    }

    writeFileSync(join(__dirname, 'data/ranges.json'), JSON.stringify(ranges, null, 4));
})();