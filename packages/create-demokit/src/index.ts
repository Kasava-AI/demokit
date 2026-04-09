import type { CliOptions, Framework } from './types'
import { run } from './cli'

const HELP = `
  create-demokit — Set up DemoKit in your project

  Usage:
    npx create-demokit [directory] [flags]

  Arguments:
    [directory]        Target project directory (default: ".")

  Flags:
    --yes, -y          Skip all prompts, use defaults
    --cloud            Set up DemoKit Cloud integration
    --framework <f>    Override detection: next|remix|react-router|tanstack-query|swr|trpc|react
    --level <l>        Generation level: l1|l2 (default: l2)
    --dry-run          Show what would be done without changes
    --no-install       Skip package installation
    --no-wire          Skip provider wiring (fixtures only)
    --verbose          Show detailed output
    -h, --help         Show this help
    -v, --version      Show version

  Examples:
    npx create-demokit                    # Interactive setup in current directory
    npx create-demokit ./my-app --yes     # Non-interactive setup
    npx create-demokit --dry-run          # Preview changes
    npx create-demokit --cloud            # Set up with DemoKit Cloud
`

const VALID_FRAMEWORKS = ['next', 'remix', 'react-router', 'tanstack-query', 'swr', 'trpc', 'react']

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2)

  const options: CliOptions = {
    directory: '.',
    yes: false,
    cloud: false,
    level: 'l2',
    dryRun: false,
    noInstall: false,
    noWire: false,
    verbose: false,
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]!

    switch (arg) {
      case '-h':
      case '--help':
        console.log(HELP)
        process.exit(0)
      case '-v':
      case '--version': {
        // Dynamic import not needed — just read from package.json at build time
        console.log('create-demokit 0.1.0')
        process.exit(0)
      }
      case '-y':
      case '--yes':
        options.yes = true
        break
      case '--cloud':
        options.cloud = true
        break
      case '--framework': {
        const val = args[++i]
        if (!val || !VALID_FRAMEWORKS.includes(val)) {
          console.error(`Invalid framework: ${val}. Valid: ${VALID_FRAMEWORKS.join(', ')}`)
          process.exit(1)
        }
        options.framework = val as Framework
        break
      }
      case '--level': {
        const val = args[++i]
        if (val !== 'l1' && val !== 'l2') {
          console.error('Invalid level. Use: l1 or l2')
          process.exit(1)
        }
        options.level = val
        break
      }
      case '--dry-run':
        options.dryRun = true
        break
      case '--no-install':
        options.noInstall = true
        break
      case '--no-wire':
        options.noWire = true
        break
      case '--verbose':
        options.verbose = true
        break
      default:
        // Positional argument: directory
        if (!arg.startsWith('-')) {
          options.directory = arg
        } else {
          console.error(`Unknown flag: ${arg}`)
          console.log(HELP)
          process.exit(1)
        }
    }
    i++
  }

  return options
}

async function main() {
  const options = parseArgs(process.argv)

  try {
    await run(options)
  } catch (err) {
    if (err instanceof Error) {
      console.error(`\nError: ${err.message}`)
      if (options.verbose && err.stack) {
        console.error(err.stack)
      }
    }
    process.exit(1)
  }
}

main()
