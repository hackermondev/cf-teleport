const { Masscan } = require('masscan');
function icmpFindOpenNetworks(range) {
    return new Promise(async (resolve, reject) => {
        const masscan = new Masscan({
            range,
            ports: '0',
            ping: true,
            wait: 3,
        });
        
        const result = [];

        masscan.once('error', reject);
        masscan.on('status', (status) => result.push(status));

        await masscan.scan();
        resolve(result);
    })    
}


const origins = require('./data/subnets.json');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const _ = require('lodash');

(async () => {
    const chunked = _.chunk(origins, 4);
    const ranges = [];

    for (let i = 0; i < chunked.length; i++) {
        const o = chunked[i];
        await Promise.all(o.map(async (query) => {
            const scan = (await icmpFindOpenNetworks(query))
                .filter(s => s.data.status == 'open').map(s => s.ip);
            
            ranges.push({ ip: query, open: scan });
        }));

        console.log(`Finished scan bulk ${i + 1}/${chunked.length}`);
    }
    

    writeFileSync(join(__dirname, 'data', 'ranges.json'), JSON.stringify(ranges, null, 4));
})();