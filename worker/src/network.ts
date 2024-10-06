import ranges from './data/ranges.json';

export function findOnlineAddress(ip: string) {
    const ips = ranges.find(r => r.ip == ip);
    if (!ips) throw new Error('Unknown datacenter');
    if (ips.open.length < 1) throw new Error('No available IPs');

    return ips.open[Math.floor(Math.random()* ips.open.length)];
}
