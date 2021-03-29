import CoreClient from 'bitcoin-core'
import ohash from 'object-hash'


const clientCache = {
  clients: {}
}

export const getClient = (conf = {
  username: 'bitcoinil',
  password: 'talisawesome',
  port: '8332',
}) => {
  const confHash = ohash(conf)
  if (confHash in clientCache.clients)
    return clientCache.clients[confHash]
  
  const client = new CoreClient(conf)
  clientCache.clients[confHash] = client
  return client
}

export const disposeClient = (conf) => {
  const confHash = ohash(conf)
  if (confHash in clientCache.clients)
    delete clientCache.clients[confHash]
}

export const getNewAddress = (label = 'btcil', type, client) =>
  client.getNewAddress(label, type)
