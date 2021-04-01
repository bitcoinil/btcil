import miner from './miner/index.mjs'
import wallet from './wallet/index.mjs'
import wizard from './wizard/index.mjs'

export default async function commands (program, context) {
  await miner(program, context)
  await wallet(program, context)
  await wizard(program, context)
}