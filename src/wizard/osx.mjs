import { cleanupTempDir, getTempDir, getProperties } from '../utils.mjs'
import Downloader from 'nodejs-file-downloader'
import { downloadSignature } from '../utils.mjs'
import { downloadCertificate } from '../utils.mjs'
import { compareCertificates } from '../utils.mjs'
import cliProgress from 'cli-progress'
import { downloadFile } from '../utils.mjs'
import ora from 'ora'
import logUpdate from 'log-update'
import Listr from 'listr'

export async function installWallet () {


  const tasks = new Listr([
    {
      title: 'OSX Installer',
      task: async () => {
        const properties = await getProperties()
        console.log('properties:', properties)
        console.log('going to install osx wallet')
        const tempDir = await getTempDir()
      
        console.log('tempDir:', tempDir)
      
        // Write output but don't hide the cursor
        const log = logUpdate.create(process.stdout, {
            showCursor: true
        });
      
        const filename = properties.binaries.osx.split('/').pop()
        console.log('filename:', filename)
        const signName = `binaries/osx/${filename}`
        const sigFiles = await downloadSignature(signName)
        console.log('sigFiles:', sigFiles)
        const cert = await downloadCertificate()
        console.log('cert:', cert)
      
        const valued = await compareCertificates(cert.certificate)
        console.log('certificates are identical:', valued)
        const bar1 = new cliProgress.SingleBar({
          format: `${filename} [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}mb`
        }, cliProgress.Presets.shades_classic);
      
        // const ora1 = ora({ text: 'Downloading wallet' }).start()
      
        const stats = {}
      
        await downloadFile(properties.binaries.osx, tempDir, filename, {
          onResponse: (response) => {
            console.log('content size: ' + response.headers['content-length'])
            bar1.start(Math.floor((response.headers['content-length'] / 1024 / 1024) * 100) / 100)
            stats.total = response.headers['content-length']
          },
          onProgress:function(percentage,chunk,remainingSize){//Gets called with each chunk.
            // console.log('% ',percentage)   
            // console.log('Current chunk of data: ',chunk)   
            // console.log('Remaining bytes: ',remainingSize)
            bar1.update(Math.floor(((stats.total * percentage) / 1024 / 1024)) / 100)
            // ora1.info('Loadding... ' + percentage)
            if (+percentage === 100) {
              setTimeout(() => bar1.stop(), 5000)
            }
          }
        })
        await new Promise((resolve) => setTimeout(resolve, 5000))


      }
    }
  ])

  return tasks
  

}
