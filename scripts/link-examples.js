#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const EXAMPLES_DIR = path.join(__dirname, '..', 'examples');
const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

const DEMOKIT_PACKAGES = [
  '@demokit-ai/core',
  '@demokit-ai/react',
  '@demokit-ai/next',
  '@demokit-ai/remix',
  '@demokit-ai/react-router',
  '@demokit-ai/swr',
  '@demokit-ai/tanstack-query',
  '@demokit-ai/trpc',
  '@demokit-ai/ai',
  '@demokit-ai/intelligence',
];

function getPackageVersion(packageName) {
  const pkgDir = packageName.replace('@demokit-ai/', '');
  const pkgJsonPath = path.join(PACKAGES_DIR, pkgDir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    return pkg.version;
  }
  return null;
}

function updateExampleDeps(examplePath, useWorkspace) {
  const pkgJsonPath = path.join(examplePath, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return false;

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  let updated = false;

  for (const depType of ['dependencies', 'devDependencies']) {
    if (!pkg[depType]) continue;

    for (const pkgName of DEMOKIT_PACKAGES) {
      if (pkg[depType][pkgName]) {
        const currentValue = pkg[depType][pkgName];
        let newValue;

        if (useWorkspace) {
          newValue = 'workspace:*';
        } else {
          const version = getPackageVersion(pkgName);
          if (version) {
            newValue = `^${version}`;
          }
        }

        if (newValue && currentValue !== newValue) {
          pkg[depType][pkgName] = newValue;
          updated = true;
        }
      }
    }
  }

  if (updated) {
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  return updated;
}

function main() {
  const command = process.argv[2];

  if (!command || !['link', 'unlink'].includes(command)) {
    console.log('Usage: node link-examples.js <link|unlink>');
    console.log('  link   - Use workspace:* for local development');
    console.log('  unlink - Use published versions (^x.x.x) for npm testing');
    process.exit(1);
  }

  const useWorkspace = command === 'link';
  const examples = fs.readdirSync(EXAMPLES_DIR).filter(f => {
    const fullPath = path.join(EXAMPLES_DIR, f);
    return fs.statSync(fullPath).isDirectory() &&
           fs.existsSync(path.join(fullPath, 'package.json'));
  });

  console.log(`${useWorkspace ? 'Linking' : 'Unlinking'} examples...`);

  for (const example of examples) {
    const examplePath = path.join(EXAMPLES_DIR, example);
    const updated = updateExampleDeps(examplePath, useWorkspace);
    if (updated) {
      console.log(`  ✓ ${example}`);
    }
  }

  console.log('\nDone! Run "pnpm install" to update node_modules.');
}

main();
