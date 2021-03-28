
import boxen from 'boxen';
import chalk from 'chalk';
import { getPackageJson } from './utils.mjs';

const pkg = getPackageJson()

export const welcome = (extra) => {
  const extraMessage = extra ? `\n\n${extra}` : ''
  const message = chalk`{blue Bitcoin Israel - Automated Wizard}
  {dim {magenta btcil {cyan v${pkg.version}}}}\n\n{dim {blue https://bitcoinil.org}}${extraMessage}`


  const options = {
    align: 'center',
    dimBorder: 1,
    padding: 1,
    margin: 1,
    borderStyle: 'doubleSingle'
  }
  try {

    const res = boxen(message, options)
    return res
  } catch (err) {
    return message
  }
}