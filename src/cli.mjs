import { countRuns, getPackageJson, errorBox } from './utils.mjs'
import commands from './commands/index.mjs'

export const init = async (program) => {
  const packageJson = await getPackageJson()
  const runIndex = await countRuns()

  program
    .name(packageJson.name)
    .version(packageJson.version)
  
  await commands(program, { runIndex })
    
  try {
    await program.parseAsync()
  } catch (error) {
    if (error.toString() !== 'Error: Aborted')
      console.log(errorBox(1004, error))
    
    process.exit(1)
  }
 
}