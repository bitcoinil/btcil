import { downloadCertificate } from './utils.mjs'
import fs from 'fs'
import path from 'path'
import { getDirName, downloadFile, downloadSignature } from './utils.mjs'
import chalk from 'chalk'

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

        const localPath =  path.normalize(dirname + '/../').replace(/^\\/g, '') + 'certificate.pem'

        // subTask.output = 'Whats local path: ' + localPath
        // await subTask.prompt({
        //   type: 'confirm'
        // })

        const local = await readFile(localPath, { encoding: 'utf8' })
        const identical = (local === downloaded)

        if (!identical && !ctx.options.ignoreCertificate)
          throw new Error('Certificate mismatch')
      },
      options: {
        bottomBar: Infinity
      }
    },
    {
      title: 'Download file signature',
      task: async (_, subTask) => {
        // try {
          const signature = ctx.signature = await downloadSignature(sigName)
        //   subTask.output = `File signature: ${signature.signature}` // JSON.stringify(signature)
        //   // await sleep(14000000)
        //   await subTask.prompt({ type: 'confirm', message: 'conf' })
        // } catch (err) {
        //   subTask.output = 'Error: ' + err
        // }
        // await subTask.prompt({ type: 'confirm', message: 'conf' })
      },
      // options: { persistentOutput: true, bottomBar: Infinity }
      options: { persistentOutput: true }
    },
    {
      title: 'Verify signed file',
      task: async (_, subTask) => {
        const { exec } = await import('child_process')
        const path = await import('path')
        const dirname = getDirName()
        const sig = ctx.signature.signature
        const cmd = `node ${path.normalize(dirname).replace(/^\\/g, '')}/crypto/verify-file.js ${file} ${ctx.certificate.filepath} ${sig}`

        // subTask.output = 'Signature:\n\n' + sig
        // subTask.output = 'Command:\n\n' + cmd
        // await subTask.prompt({ type: 'confirm', message: 'click' })

        const verified = await new Promise(r => exec(cmd, async (err, stdout, stderr) => {
          // subTask.output = 'We got stdout: ' + stdout
          // await subTask.prompt({ type: 'confirm', message: 'sup' })
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
        persistentOutput: true,
        // bottomBar: Infinity
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

export const downloadFileTask = async (ctx, task) => {
  const makeSpinner = (width = 8) =>
    [
      ...[...(Array(width))]
        .map((_, i) => ([...Array(i)].map(() => '▰')).join('') + ([...Array(width - i)].map(() => '▱')).join('') ),
      ([...Array(width)].map(() => '▰')).join('')
    ]
  const spinner = {
    frames: makeSpinner(7)
  }
  

  // ! Prompt download confirm - useful for debugging
  // await task.prompt({ type: 'confirm', message: 'Confirm file download' }) && 
  await downloadFile(ctx._downloadUrl, ctx._walletTempDir, ctx._walletBasename, {
    onResponse: (response) => {
      ctx.stats = { total: response.headers['content-length'], size: Math.floor((response.headers['content-length'] / 1024 / 1024) * 100) / 100 }
      task.output = spinner.frames[0] + ' ' + 'Size: ' + ctx.stats.total
    },
    onProgress: (percentage, chunk, remainingSize) => {
      const per = parseFloat(percentage)
      const frameNum = Math.ceil((spinner.frames.length - 1) * (per / 100))
      const frame = spinner.frames[frameNum]
      const totalDownload = Math.floor(((ctx.stats.total - remainingSize) / 1024 / 1024) * 100) / 100
      task.output = chalk`${ctx._walletBasename} ${frame} ${percentage}% {dim [${totalDownload}/${ctx.stats.size}mb]}`

      if (per >= 100) {
        task.output = 'Download complete.'
      }
    },
  })
}