import pc from 'picocolors'

let verboseMode = false

export function setVerbose(v: boolean) {
  verboseMode = v
}

export function verbose(msg: string) {
  if (verboseMode) {
    console.log(pc.dim(`  ${msg}`))
  }
}

export function info(msg: string) {
  console.log(msg)
}

export function warn(msg: string) {
  console.log(pc.yellow(`  warning: ${msg}`))
}

export function error(msg: string) {
  console.error(pc.red(`  error: ${msg}`))
}
