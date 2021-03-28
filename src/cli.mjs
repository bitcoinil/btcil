import osName from 'os-name'
import { getSystemModule } from './platforms/index.mjs'
import { countRuns, getPackageJson, makeContext } from './utils.mjs'
import { Command, Option } from 'commander/esm.mjs'
import chalk from 'chalk'
import commands from './commands/index.mjs'



export const init = async (program) => {

  const os = osName()
  const platform = await getSystemModule(os)
  const packageJson = await getPackageJson()
  const runIndex = await countRuns()

  let _l
  
  program
    .name(packageJson.name)
    .version(packageJson.version)

    // .addOption(new Option('-i, --install [wallet]', 'Install BitcoinIL wallet').choices(platform.wallets?.map(({name}) => name)))
    // .addOption(new Option('-m, --install-miner [type]', 'Install BitcoinIL Compatible Miner'))
    // .addOption(new Option('-b, --build', 'Build wallet/miner from source' + `${(_l = platform.wallets?.filter(({build}) => build)) && _l.length ? ` (supported wallets: ${_l.map(({name}) => name).join(', ')})` : ' (not supported)'}`))
    // .addOption(new Option('-t, --testnet', 'Use testnet'))
    // .addOption(new Option('-p, --password <string>', 'Use pre-defined password'))
    // .addOption(new Option('-c, --confirm', 'Confirm all user prompts automatically'))
    // .addOption(new Option('-o, --ignore-certificate', 'Supress certificate mismatch errors'))
    // .addOption(new Option('-is, --ignore-signatures', 'Supress file signature errors'))
    // .addOption(new Option('-sd, --skip-downloads', 'Avoid re-downloading assets'))
    // .addOption(new Option('-j, --json-rpc', 'Configure JSON-RPC'))
    // .addOption(new Option('-d, --debug', 'Debug').hideHelp())
    // .addOption(new Option('-x, --mock <target>', 'Mock target platform (ignore host platform identification)').hideHelp())
    // .addOption(new Option('-pt, --paths [pathname]', 'Show paths (use with -c to create tempDir)').hideHelp())
    // .addOption(new Option('-pt, --paths [pathname]', 'Show paths (use with -c to create tempDir)').hideHelp())
  
  await commands(program, { runIndex })
    
  program.parse()
}