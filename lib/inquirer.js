const inquirer = require('inquirer');
const files = require('./files');

module.exports = {
	addremote_questions: function () {
		const questions = [
			{
				name: 'type',
				type: 'input',
				message: 'Type of repo (`i` for individual, `c` for collection):',
				validate: function(value) {
					if (value.match(/^[ic]$/)) {
						return true;
					} else {
						return 'Please specify type.';
					}
				}
			},
			{
				name: 'url',
				type: 'input',
				message: 'URL of the repo (end with slash, after which there is a `keyring.json` file):',
				validate: function(value) {
					if (value.match(/^https?:\/\/.+\/?$/)) {
						return true;
					} else {
						return 'Please specify the URL, after which there is a `keyring.json` file.';
					}
				}
			}
		];
		return inquirer.prompt(questions);
	},
}
