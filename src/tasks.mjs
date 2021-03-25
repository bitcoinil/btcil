import { downloadCertificate } from './utils.mjs'
import fs from 'fs'
import path from 'path'
import { getDirName } from './utils.mjs'
import { downloadSignature } from './utils.mjs'

const { readFile } = fs.promises

export const makeFileIntegrityCheck = (file, sigName) =>
  (ctx, task) => task.newListr(parent => [
    {
      title: 'Prepare certificate',
      task: async () => {
        ctx.certificate = await downloadCertificate()
      }
    },
    {
      title: 'Verify certificate',
      task: async (_, subTask) => {
        const dirname = getDirName()
        const downloaded = ctx.certificate.certificate

        const localPath =  path.resolve(dirname, '..', 'certificate.pem')
        const local = await readFile(localPath, { encoding: 'utf8' })
        const identical = (local === downloaded)

        if (!identical && !ctx.options.ignoreCertificate)
          throw new Error('Certificate mismatch')
      }
    },
    {
      title: 'Download signature',
      task: async (_, subTask) => {
        const signature = ctx.signature = await downloadSignature(sigName)
        subTask.output = `File signature: ${signature.signature}` // JSON.stringify(signature)
        // await sleep(14000000)
      },
      options: { persistentOutput: true }
    },
    {
      title: 'Verify signed file',
      task: async (_, subTask) => {
        const { exec } = await import('child_process')
        const path = await import('path')
        const dirname = getDirName()
        const sig = ctx.signature.signature
        const cmd = `node ${dirname}/crypto/verify-file.js ${file} ${ctx.certificate.filepath} ${sig}`
        const verified = await new Promise(r => exec(cmd, (err, stdout, stderr) => {
          r(JSON.parse(stdout))
        }))
        if (!verified && !ctx.options.ignoreSignatures)
        throw new Error('File failed signature test')
        else if (!verified) {
          subTask.output = 'File signature test failed'
        }
        
        subTask.output = 'File signature verified'
        ctx.signatureVerified = true
      },
      options: {
        persistentOutput: true
      }
    }
  ], { rendererOptions: { persistentOutput: true }})

export const configureJSONRPC = async (ctx, task) => {
  const { set, get } = await import('./bitcoinil-conf.mjs')
  ctx.conf = await get()

  if (!(ctx.conf.rpcuser && ctx.conf.rpcpassword)) {
    const rpcpassword = ctx.options.password
      || (ctx.options.confirm ? 'talisawesome' : await task.prompt({
        type: 'password',
        message: 'Enter new password for JSON-RPC'
      }))
  
    await set(state => ({
      rpcallowip: '127.0.0.1',
      rpcuser: 'bitcoinil',
      rpcpassword,
      ...(+state.testnet !== 1 ? { port: 8332 } : {}),
    }))
  }
}
