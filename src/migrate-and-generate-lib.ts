/* eslint-disable no-console */
import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { encodeAddressesForGenerateLib } from './encode-addresses-for-generate-lib';
import { getContractAddressesFromMigrate } from './get-contract-addresses-from-migrate';

const args = process.argv.filter((_r, index) => index >= 2);
if (args.length < 2) {
  throw new Error('Invalid syntax, should be: <contract_cache_resource_name> <migrate_command> <migrate_command_opts>');
}

const cacheResourceName = args.shift();
const bin = args.shift();

const output = spawnSync(bin, args, {
  cwd: process.cwd(),
}).output.toString();

console.log(output);

let configJson = { currentVersion: 0, contracts: {} };
let cachedConfigJson = { currentVersion: 0, contracts: {} };

const deployedContractsPath = resolve(process.cwd(), './deployed_contracts');
mkdirSync(deployedContractsPath, { recursive: true });
const cacheResourcePath = resolve(deployedContractsPath, `${cacheResourceName}.json`);
if (existsSync(cacheResourcePath)) {
  cachedConfigJson = JSON.parse(readFileSync(cacheResourcePath).toString());
}

configJson = getContractAddressesFromMigrate(output);
configJson.contracts = {
  ...cachedConfigJson.contracts,
  ...configJson.contracts,
};

writeFileSync(cacheResourcePath, JSON.stringify(configJson, undefined, 2));

const encodedContracts = encodeAddressesForGenerateLib(configJson.contracts);

console.log(encodedContracts);

spawnSync(
  process.env.npm_execpath.includes('yarn.js') ? 'yarn' : 'npm',
  ['generate-lib', `--addresses="${encodedContracts}"`],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
  },
);
