import configure from './configure.mjs'
export default async function walletCommand (program) {
  const command = program
    .command('wallet')

  configure(command)
  
}