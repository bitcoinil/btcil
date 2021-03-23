import tmp from 'tmp'
const tempCache = {}

export async function cleanupTempDir() {
  if (tempCache.cleanupCallback) tempCache.cleanupCallback()
}
export async function getTempDir () {
  if (tempCache.dir) return tempCache.dir
  
  tmp.dir(function _tempDirCreated(err, path, cleanupCallback) {
    if (err) throw err;
  
    console.log('Dir: ', path);
    tempCache.dir = path
    tempCache.cleanupCallback = cleanupCallback
    
    // Manual cleanup
    // cleanupCallback();
  });
}