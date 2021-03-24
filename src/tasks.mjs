import chalk from 'chalk'
import osName from 'os-name'
import prompts from 'prompts'
import Observable from 'zen-observable'
import { sleep } from './utils.mjs'
import { countRuns } from './utils.mjs'

export const prepareInstaller = async (ctx, task) =>
  {
    const thisOs = osName()
    await countRuns()
  
    task.output = 'Prepared!'
    task.title = 'Installer ready'
    Object.assign(ctx, {
      os: thisOs
    })
  }

export const confirmInstallation = async (ctx, task) => {
  ctx.confirmInstall = await task.prompt({
    type: 'toggle',
    message: `You are about to install ${ctx.os} - are you sure?`,
    initial: true,
    enabled: chalk`{green Yes}`,
    disabled: chalk`{red No}`
  })

  task.output = ctx.confirmInstall ? 'Confirmed!' : 'Aborted!'
  await sleep(3000)
}

export const confirmInstallationX = (ctx, task) =>
  new Observable(async observer => {
    const isStart = await prompts({
      type: 'confirm',
      name: 'confirmed',
      initial: true,
      message: `You are about to install ${ctx.os} - are you sure?`
    })
    console.log('what is isStart:', isStart)

    if (isStart.confirmed) {
      let osWizardName = ctx.os.match(/^macOS/) ? 'osx' : ctx.os.match(/^Windows/) ? 'windows' : 'linux'
      
      const ofos = await import('./wizard/' + osWizardName + '.mjs')
      console.log('ofos ready:', ofos)
      const installResult = ofos.installWallet()
      console.log('install result:', installResult)
      installResult.run().catch(err => {
        console.error(err);
      });

    } else {
      console.log('Aborting.')
    }
  })