import { Command } from 'commander/esm.mjs'
import { init } from './cli.mjs'

const program = new Command();
init(program)
