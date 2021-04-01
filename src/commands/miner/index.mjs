// import configure from './configure.mjs'
import start from './start.mjs'
export default async function walletCommand (program) {
  const command = program
    .command('miner')
  
  // await configure(command) 
  await start(command) 
}