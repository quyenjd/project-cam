import Chalk from 'chalk';
import Clear from 'clear';
import Enquirer from 'enquirer';
import { oraPromise } from 'ora';

/**
 * Normalize given name to put in the `name` field of `package.json`.
 *
 * @param {string} name Name to be normalized.
 *
 * @returns {string} The normalized name.
 */
export function normalizeName (name) {
  return name.trim().toLowerCase().replace(/[^a-z\-_]/, '-');
}

/**
 * Prompt a Yes/No question.
 *
 * @param {string} message Message of the prompt.
 * @param {string=} yes Yes option message.
 * @param {string=} no No option message.
 * @param {boolean=} clear Whether to clear the screen (default to false).
 *
 * @returns {Promise<boolean>} A Promise object that resolves to the answer.
 */
export function promptToggle (message, yes, no, clear = false) {
  if (clear) Clear();
  return Enquirer.prompt({
    type: 'toggle',
    name: 'prompt',
    message,
    enabled: yes ?? 'Yes',
    disabled: no ?? 'No'
  }).then((answer) => answer.prompt).catch(() => false);
}

/**
 * Prompt an input question.
 *
 * @param {string} question Question of the prompt.
 * @param {string=} initial Initial value of the prompt.
 * @param {(() => boolean | Promise<boolean> | string | Promise<string>)=} validator Function to check the answer before it is returned.
 * @param {boolean=} clear Whether to clear the screen (default to false).
 *
 * @returns {Promise<string>} A Promise object that resolves to the answer.
 */
export function promptInput (message, initial = '', validator = () => true, clear = false) {
  if (clear) Clear();
  return Enquirer.prompt({
    type: 'input',
    name: 'prompt',
    message,
    initial,
    validate: validator
  }).then((answer) => answer.prompt).catch(() => initial);
}

/**
 * Prompt a number question.
 *
 * @param {string} question Question of the prompt.
 * @param {number=} initial Initial value of the prompt.
 * @param {boolean=} clear Whether to clear the screen (default to false).
 *
 * @returns {Promise<number>} A Promise object that resolves to the answer.
 */
export function promptNumeral (message, initial = 0, clear = false) {
  if (clear) Clear();
  return Enquirer.prompt({
    type: 'numeral',
    name: 'prompt',
    message,
    min: 0,
    initial,
    round: true
  }).then((answer) => answer.prompt).catch(() => initial);
}

/**
 * Prompt a series of questions.
 *
 * @param {string} message Message of the prompt.
 * @param {{ name: string, message?: string, initial?: string }[]} questions Questions of the prompt.
 * @param {boolean=} clear Whether to clear the screen (default to false).
 *
 * @returns {Promise<Record<string, unknown>>} A Promise object that resolves to the answer.
 */
export function promptForm (message, questions, clear = false) {
  if (clear) Clear();
  return Enquirer.prompt({
    type: 'form',
    name: 'prompt',
    message,
    choices: questions
  }).then((answer) => answer.prompt).catch(() => {
    return {};
  });
}

/**
 * Run an array of tasks one after another.
 *
 * @param {{ title: string, task: () => Promise<void> }[]} tasks The tasks.
 *
 * @returns {Promise<void>} A Promise object that resolves if all the tasks succeed.
 */
export async function runTask (tasks) {
  Clear();
  console.log('Tasks:');

  if (!tasks.length) {
    console.log(Chalk.dim('  No tasks.'));
    return;
  }

  for (let i = 0; i < tasks.length; ++i) {
    const task = tasks[i];

    await oraPromise(Promise.resolve(new Promise(resolve => resolve(task.task()))), {
      indent: 2,
      text: task.title
    });
  }
}
