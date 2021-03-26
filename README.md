# BTCIL Automated Wizard

A Command-line utility to automatically install [BTCIL](https://bitcoinil.org) related software (wallets, miners) and assist with configuring the local system.

For more information visit the [Bitcoin Israel - Guides Website](https://guides.bitcoinil.org).

Follow us on [twitter](https://twitter.com/il_bitcoin), on [telegram channel](https://t.me/itsbtcil) or [telegram group](https://t.me/bitcoinilnetwork), and on [facebook פשעק](https://www.facebook.com/bitcoinli) and [facebook group](https://www.facebook.com/groups/bitcoinli).

## Usage


> Testnet Notification - before April 1st 2021 use the wallet in Testnet mode: `$ btcil -t`

### Instant NPX

Run the wizard using [`npx`](https://www.npmjs.com/package/npx):

```sh
$ npx btcil
```

### Install Locally

Install `btcil` locally:

```sh
$ npm i -g btcil
```

After installation is complete run:

```sh
$ btcil
```

### Options

```sh
$ btcil --help
Usage:  btcil [options]

Run the BTCIL Automated Wizard

Options:
  -i, --install [wallet]      Install BitcoinIL wallet
  -b, --build                 Build wallet from source
  -m, --install-miner [type]  Install BitcoinIL Compatible Miner
  -t, --testnet               Use testnet
  -p, --password <string>     Use pre-defined password
  -c, --confirm               Confirm all user prompts automatically
  -s, --silent                Silent (unattended) operation - suppress all output except errors
  -o, --ignore-certificate    Supress certificate mismatch errors
  -is, --ignore-signatures    Supress file signature errors
  -sd, --skip-downloads       Avoid re-downloading assets
  -j, --json-rpc              Configure JSON-RPC
  -h, --help                  display help for command

