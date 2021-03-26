import { installComponents } from './install-components.mjs'

export const activities = (ctx, subTask) =>
  subTask.newListr(parent => [
    {
      task: () => parent.title = 'Processing...'
    },
    {
      // title: 'Con',
      enabled: () => false,
      task: async (_, st) => {
        st.output = JSON.stringify(ctx.options)
        await st.prompt({
          type: 'confirm'
        })
      },
      options: {
        bottomBar: Infinity
      }
    },
    {
      title: 'Select activity',
      enabled: () => !ctx.options.install && !ctx.options.installMiner,
      task: selectActivity
    },
    {
      // title: 'Select activity [2]',
      enabled: () => !(!ctx.options.install && !ctx.options.installMiner),
      task: setActivity('Install Components')
    },
    {
      // title: 'Exit',
      enabled: () => ctx.activity === 'Exit',
      task: () => {
        parent.title = 'Goodbye!'
        parent.output = `#${ctx.runIndex}`
      },
      options: {
        persistentOutput: true
      }
    },
    {
      title: 'Install Components',
      enabled: () => ctx.activity === 'Install Components',
      task: installComponents
    }
  ], {
    rendererOptions: {
      persistentOutput: true
    }
  })

export const setActivity = (activity) => (ctx, task) => {
  ctx.activity = activity
}

export const selectActivity = async (ctx, task) =>{
  ctx.activity = await task.prompt({
    type: 'select',
    message: 'Select activity',
    choices: ['Install Components', 'Download Components', 'Configuration Assistant', 'Exit']
  })
}
