import { getTempDir, getProperties } from '../utils.mjs'

export const prepareProperties = async (ctx, task) => {
  task.title = 'Loading properties...'
  const properties = await getProperties()
  ctx.properties = properties
  task.title = 'Properties ready'
}

export const prepareTempDir = async (ctx, task) => {
  const tempDir = await getTempDir()
  task.output = 'Temp dir ready: ' + tempDir
  ctx.tempDir = tempDir
}