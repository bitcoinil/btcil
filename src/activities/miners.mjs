import chalk from "chalk"

export const selectMiner = async (ctx, task) => 
  task.newListr(parent => 
    [

      {
        task: 'Confirm Miner',
        skip: () => ctx.options.installMiner,
        task: async (_ctx, subTask) => {
          const installMiner = await subTask.prompt({
            type: 'toggle',
            message: 'Would you like to install BitcoinIL miner?',
            initial: true,
            enabled: 'Yes - install miner',
            disabled: 'No'
          })

          ctx.selections = { 
            ...(ctx.selections || {}),
            installMiner
          }

          parent.output = installMiner ? 'Install' : 'No'
        }
      },
      {
        skip: () => !ctx.options.installMiner,
        task: () => {

          ctx.selections = { 
            ...(ctx.selections || {}),
            installMiner
          }
        }
      },
      {
        task: 'Prepare miner installation',
        skip: () => 
          !ctx.selections?.installMiner, 
          // && !(ctx.options.installMiner === true && (ctx.platform.miners?.gpu.length > 1 || (ctx.platform.wallets[0].build && ctx.platform.wallets[0].download))),
        task: async (_ctx, subTask) => {
          const minerTitle = ctx.platform.miners.length > 1
            ? typeof ctx.options.installMiner === 'string' && ctx.platform.miners.find(({name}) => name === ctx.options.installMiner)?.title
            || await subTask.prompt({
                type: 'Select',
                message: 'Select miner to install',
                choices: ctx.platform.miners.map(({title}) => title),
                maxChoices: 1
              })
            : ctx.platform.miners[0].title
            
          const platformMiner = ctx.platform.miners.find(({ title }) => title === minerTitle)
          const miner = platformMiner.name
            
          const isBuildMiner = platformMiner.build
            ? ((typeof ctx.options.installMiner === 'undefined'
                && !ctx.options.build)
                ? await subTask.prompt({
                      type: 'Toggle',
                      message: 'Build miner from source?',
                      enabled: 'Yes',
                      disabled: 'No'
                    })
                : ctx.options.build
              )
            : false
          
          const isDownloadMiner = platformMiner.download
            ? !isBuildMiner
            : false
          
          ctx.selections = { 
            ...(ctx.selections || {}),
            miner,
            minerTitle: platformMiner.title,
            isBuildMiner,
            isDownloadMiner
          }
        }
      },
      {
        task: () => {
          if (ctx.selections.isBuildMiner || ctx.selections.isDownloadMiner)
            parent.output = chalk`Selected miner: {cyan ${ctx.selections.minerTitle}}${ctx.selections.isBuildMiner ? ` (build from source)` : ''}`
        }
      }
    ],
    { concurrent: false, rendererOptions: { collapse: true, collapseErrors: true } }
  )

export const installMiner = (ctx, task) =>
  task.newListr(parent => [
    {
      title: 'Download miner binaries',
      task: async () => {
        // await sleep(3000)
      }
    },
    {
      task: (_ctx, subTask) => {
        parent.output = '[parent] Miner installed successfully'
      },
      options: {
        persistentOutput: true

      }

    }
  ])

export const buildMiner = async (ctx, task) =>
  task.newListr(parent => [
    {
      title: 'Download miner sources...',
      task: async () => {
        // await sleep(3300)
      }
    }
  ])
