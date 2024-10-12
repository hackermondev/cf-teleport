const { setGlobalDispatcher, Agent } = require('undici');

const ranges = require('./data/ranges.json');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { fetch } = require('undici');

setGlobalDispatcher(new Agent({
    allowH2: true
}));



(async () => {
    const datacenters = (await Promise.all(ranges.map(async range => {
        const ip = range.open[0];
        const host = process.env['CF_TELEPORT_HOST'];
        const params = new URLSearchParams({
            ip: ip,
            timeout: '1500',
            proxy: 'https://cloudflare.com/cdn-cgi/trace'
        });

        const request = await fetch(`https://${host}/?${params.toString()}`, {
            method: 'HEAD'
        }).catch(err => err);

        const colo = request.headers.get('cf-teleport-cloudflare-colo');
        if (colo) {
            return {
                colo,
                ...range,
            };
        } 
    }))).filter(r => r != null);

    console.log(datacenters, datacenters.length);
    writeFileSync(join(__dirname, 'data', 'colos.json'), JSON.stringify(datacenters, null, 4));
})();