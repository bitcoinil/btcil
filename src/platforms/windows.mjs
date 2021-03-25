import { sleep } from "../utils.mjs"

export const getWallet = () => {

}
export const wallets = [
  {
    name: 'core',
    title: 'BitcoinIL Core',
    download: async () => {
      await sleep(5000)
    },
    // build: () => new Observable(async observer => {
    //   observer.next('Building BitcoinIL Core!!!')
    //   await sleep(4000)
    //   observer.complete()
    // })
  },
]