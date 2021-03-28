import osName from 'os-name'
import { Command, Option } from 'commander/esm.mjs'
import { countRuns } from './utils.mjs'
import { Listr } from 'listr2'
import { welcome } from './messages.mjs'
import logUpdate from 'log-update'
import cliSpinners from 'cli-spinners'
import { errorBox } from './utils.mjs'
import { getSystemModule } from './platforms/index.mjs'
import { activities } from './activities/index.mjs'
import { prepareProperties } from './tasks/system-tasks.mjs'
import { prepareInstaller } from './activities/install-components.mjs'
import { getPackageJson } from './utils.mjs'
import * as cli from './cli.mjs'

const mainTasks = new Listr([
  {
    title: 'Prepare installer',
    task: prepareInstaller,
    options: {
      persistentOutput: true
    }
  },
  {
    title: 'Load properties',
    task: prepareProperties,
    options: {
      persistentOutput: true
    }
  },
  
  {
    title: 'Activities',
    task: activities,
    options: {
      persistentOutput: true
    }
  },

],
{ concurrent: false }
)
initialize()


async function initialize () {
  // Load Args
  const program = new Command();
  
  const { runIndex, options } = await cli.init(program)
  
  if (options.doLongWork) {
    let frameNumber = 0
    const spinner = cliSpinners.aesthetic
    const frame = async () => {
      const spinnerFrame = spinner.frames[frameNumber = ++frameNumber % spinner.frames.length]
      logUpdate(welcome(`Loading...\n${spinnerFrame} `))
    }
    const tid = setInterval(frame, 220)
  
    await new Promise(resolve => setTimeout(resolve, 800))
    // Long polling work here if needed before setup start
    clearInterval(tid)
  }

  logUpdate(welcome())
  logUpdate.done()
  
  try {
    const res = await mainTasks.run({ options, runIndex })
    if (!res.platform) console.error(errorBox(1002, `Platform not supported`))
  } catch (error) {
    if (error.toString() !== 'Error: Aborted')
      console.log(errorBox(1003, error))
    
    process.exit(1)
  }
}
