const extractSubnets = (text) => {
    const subnetRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{2})/g;
    const subnets = [...text.matchAll(subnetRegex)].map(match => match[0]);
    return subnets;
};

// Example usage
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('path');

const input = readFileSync(join(__dirname, 'data', 'subnets.txt')).toString();
const subnetsArray = extractSubnets(input);

console.log(subnetsArray, subnetsArray.length);
writeFileSync(join(__dirname, 'data', 'subnets.json'), JSON.stringify(subnetsArray, null, 4));