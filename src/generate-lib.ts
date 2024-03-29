import { writeFileSync, readdirSync, mkdirSync, rmdirSync, existsSync, copyFileSync } from 'fs';
import { resolve, basename } from 'path';

const targets = Object.entries(process.env)
  .filter(([entryName]) => entryName.startsWith('npm_package_typechain_lib_generator_targets_'))
  .map(([, entryValue]) => resolve(entryValue));

const contractsAddressesArg = process.argv.find(r => r.startsWith('--addresses='));
const contractMap = {};
if (contractsAddressesArg) {
  const contractEntries = contractsAddressesArg
    .replace('--addresses=', '')
    .replace(/['"]/gms, '')
    .split(',')
    .map(r =>
      r
        .trim()
        .split('=')
        .map(r => r.trim()),
    ) as [string, string][];
  contractEntries.forEach(([contractName, contractAddress]) => {
    contractMap[contractName] = contractAddress;
  });
}

const cwd = process.cwd();
const typechainOutDir = resolve(cwd, process.env.npm_package_typechain_lib_generator_typechain_output_dir);
const truffleCompileOutDir = resolve(cwd, process.env.npm_package_typechain_lib_generator_truffle_compile_output_dir);

if (!typechainOutDir) {
  throw new Error(
    'Typechain output directory not informed in the package.json: please set "typechain-develop-server"."typechain-output-dir"',
  );
}

if (!truffleCompileOutDir) {
  throw new Error(
    'Truffle compile output directory not informed in the package.json: please set "typechain-develop-server"."truffle-compile-output-dir"',
  );
}

for (const target of targets) {
  if (existsSync(target)) {
    rmdirSync(target, { recursive: true });
  }
  mkdirSync(target, { recursive: true });
  mkdirSync(resolve(target, 'types'), { recursive: true });
  mkdirSync(resolve(target, 'data'), { recursive: true });
}

const jsonList = readdirSync(truffleCompileOutDir);
for (const jsonFile of jsonList) {
  const contents = require(resolve(truffleCompileOutDir, jsonFile));
  const contractName = basename(jsonFile, '.json');
  const abiFileContents = `export const ${contractName}Abi = ${JSON.stringify(contents.abi, undefined, 2)};\n`;
  for (const target of targets) {
    writeFileSync(resolve(target, 'data', `${contractName}Abi.ts`), abiFileContents);
  }
}

const typingFiles = readdirSync(typechainOutDir).filter(f => f.endsWith('.d.ts'));

for (const typingFile of typingFiles) {
  for (const target of targets) {
    copyFileSync(resolve(typechainOutDir, typingFile), resolve(target, 'types', typingFile));
  }
}

let contractMapFileSrc = '';
Object.entries(contractMap).forEach(([contractName, address]) => {
  contractMapFileSrc += `export const ${contractName}Address = '${address}';\n`;
});

for (const target of targets) {
  writeFileSync(resolve(target, 'data', 'ContractAddresses.ts'), contractMapFileSrc);
}
