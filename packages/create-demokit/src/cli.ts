import { resolve, join } from 'node:path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { CliOptions, CliResult, FileChange, Framework } from './types'
import { detectFramework, FRAMEWORK_LABELS } from './detect/framework'
import { checkExistingInstallation } from './detect/existing'
import { getRequiredPackages, getMissingPackages } from './install/packages'
import { installPackages } from './install/runner'
import { scanProject } from './scan/scanner'
import { generateFixturesFile, getFixturesPath } from './generate/fixtures'
import { generateProviderFile, getProviderPath } from './generate/provider'
import { generateCloudConfig, generateEnvEntries } from './generate/config'
import { wireProvider } from './wire/index'
import { confirmFramework, confirmEndpoints, confirmOverwrite } from './ui/prompts'
import { printSummary } from './ui/summary'
import { detectPackageManager } from './utils/package-manager'
import { fileExists, writeFile, readFile } from './utils/fs'
import { setVerbose, warn, error } from './utils/logger'

export async function run(options: CliOptions): Promise<void> {
  const dir = resolve(options.directory)
  setVerbose(options.verbose)

  p.intro(pc.bgCyan(pc.black(' create-demokit ')))

  // Verify project exists
  if (!fileExists(join(dir, 'package.json'))) {
    p.cancel('No package.json found. Run this command from the root of your project.')
    process.exit(1)
  }

  const result: CliResult = {
    packagesInstalled: [],
    filesChanged: [],
    endpointsDetected: 0,
    framework: 'react',
  }

  // Step 1: Detect framework
  const s1 = p.spinner()
  s1.start('Detecting framework')

  let framework: Framework
  if (options.framework) {
    framework = options.framework
    s1.stop(`Framework: ${FRAMEWORK_LABELS[framework]} (specified)`)
  } else {
    const detection = detectFramework(dir)
    s1.stop(`Detected: ${detection.framework}`)

    if (detection.framework !== 'react') {
      console.error(
        `\nDemoKit now targets React SPAs with a separate API.\n` +
          `Detected: ${detection.framework}.\n\n` +
          `Next.js apps that fetch client-side can use @demokit-ai/react directly.\n` +
          `TanStack Query and SWR apps need no adapter — network interception covers them.\n` +
          `Docs: https://demokit.ai/docs/integrations/react\n`
      )
      process.exit(1)
    }

    framework = detection.framework

    if (!options.yes) {
      framework = await confirmFramework(framework)
    }
  }
  result.framework = framework

  // Step 2: Check existing installation
  const existing = checkExistingInstallation(dir, framework)
  if (existing.isComplete) {
    p.log.info('DemoKit packages already installed')
  }

  // Step 3: Install packages
  if (!options.noInstall && !existing.isComplete) {
    const required = getRequiredPackages(framework, options.cloud)
    const missing = getMissingPackages(required, existing.packages)

    if (missing.length > 0) {
      const pm = detectPackageManager(dir)
      const s3 = p.spinner()
      s3.start(`Installing ${missing.join(', ')}`)

      const success = installPackages(pm, missing, dir)
      if (success) {
        s3.stop(`Installed ${missing.length} package${missing.length === 1 ? '' : 's'}`)
        result.packagesInstalled = missing
      } else {
        s3.stop('Installation failed — continuing without packages')
      }
    }
  }

  // Step 4: Scan codebase
  const s4 = p.spinner()
  s4.start('Scanning for API endpoints')
  const scanResult = scanProject(dir, framework)
  s4.stop(`Found ${scanResult.endpoints.length} endpoint${scanResult.endpoints.length === 1 ? '' : 's'}`)
  result.endpointsDetected = scanResult.endpoints.length

  // Step 5: Generate fixtures
  if (!options.yes) {
    const proceed = await confirmEndpoints(scanResult.endpoints)
    if (!proceed) {
      p.log.info('Skipping fixture generation')
    }
  }

  const fixturesPath = join(dir, getFixturesPath(framework))
  const fixturesContent = generateFixturesFile(scanResult, framework)

  if (fileExists(fixturesPath)) {
    const shouldOverwrite = options.yes ? false : await confirmOverwrite(getFixturesPath(framework))
    if (!shouldOverwrite) {
      result.filesChanged.push({
        path: getFixturesPath(framework),
        action: 'skipped',
        description: 'File already exists',
      })
    } else if (!options.dryRun) {
      writeFile(fixturesPath, fixturesContent)
      result.filesChanged.push({
        path: getFixturesPath(framework),
        action: 'modified',
        description: 'Regenerated fixtures',
      })
    }
  } else {
    if (!options.dryRun) {
      writeFile(fixturesPath, fixturesContent)
    }
    result.filesChanged.push({
      path: getFixturesPath(framework),
      action: options.dryRun ? 'skipped' : 'created',
      description: 'Demo fixtures',
    })
  }

  // Generate provider file
  const providerPath = join(dir, getProviderPath(framework))
  if (!fileExists(providerPath)) {
    const providerContent = generateProviderFile(framework)
    if (!options.dryRun) {
      writeFile(providerPath, providerContent)
    }
    result.filesChanged.push({
      path: getProviderPath(framework),
      action: options.dryRun ? 'skipped' : 'created',
      description: 'DemoKit provider wrapper',
    })
  }

  // Cloud config
  if (options.cloud) {
    const configPath = join(dir, 'lib', 'demokit-config.ts')
    if (!fileExists(configPath)) {
      if (!options.dryRun) {
        writeFile(configPath, generateCloudConfig())
      }
      result.filesChanged.push({
        path: 'lib/demokit-config.ts',
        action: options.dryRun ? 'skipped' : 'created',
        description: 'DemoKit Cloud config',
      })
    }

    // Append to .env.local
    const envPath = join(dir, '.env.local')
    const envContent = readFile(envPath) ?? ''
    if (!envContent.includes('DEMOKIT_API')) {
      if (!options.dryRun) {
        writeFile(envPath, envContent + generateEnvEntries())
      }
      result.filesChanged.push({
        path: '.env.local',
        action: options.dryRun ? 'skipped' : (envContent ? 'modified' : 'created'),
        description: 'DemoKit Cloud env vars',
      })
    }
  }

  // Step 6: Wire provider into layout
  if (!options.noWire) {
    const wireChanges = wireProvider(dir, framework, options.dryRun)
    result.filesChanged.push(...wireChanges)
  }

  // Step 7: Summary
  if (options.dryRun) {
    p.log.warn('Dry run — no files were modified')
  }

  printSummary(result, options.cloud)
  p.outro('Done!')
}
