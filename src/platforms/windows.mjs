export const getWallet = () => {

}
export const wallets = [
  {
    name: 'core',
    title: 'BitcoinIL Core',
    download: () => new Observable(async observer => {
      observer.next('Downloading BitcoinIL Core!!!')
      await sleep(4000)
      observer.complete()
    }),
    build: () => new Observable(async observer => {
      observer.next('Building BitcoinIL Core!!!')
      await sleep(4000)
      observer.complete()
    })
  },
  {
    title: 'BitcoinIL Electrum',
    name: 'electrum',
    download: () => new Observable(async observer => {
      observer.next('Downloading BitcoinIL Core!!!')
      await sleep(4000)
      observer.complete()
    }),
    // build: () => new Observable(async observer => {
    //   observer.next('Building BitcoinIL Core!!!')
    //   await sleep(4000)
    //   observer.complete()
    // })
  }
]