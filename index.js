#!/usr/local/bin/node

'use strict';

const os = require('os');
const fs = require('fs');
const URL = require('url');
const crypto = require('crypto');
const exec = require('child_process').exec;
const program = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const request = require('request');

const files = require('./lib/files.js');
const inquirer = require('./lib/inquirer.js');
const DBMan = require('./lib/DBMan.js');

const pkg = require('./package.json');

const home = os.homedir();

// ----------------------------------------------------------------------------

let appenv = {};

let ndebugModeOn = true;
// ndebugModeOn = false;
let ndebug = function (arg) {
    if (ndebugModeOn) {
        console.log(arg);
    }
};

let init_Database = function () {
    fs.writeFileSync(`${home}/.tesseract-pgp/db.json`, JSON.stringify({
        root_keys: {
            '80690EBD599119050EF943AF037F2FB3D5E2F043': {
                seq: 1,
                id: 'D5E2F043',
                uri: 'https://joyneop.xyz/_keyring/',
                old_key: '8F45D72357EEB6C556662C8D68A0B4B6EEF9762A',
                agent_keys: [
                    [ 2, '68061AF0C1813884EF11B50A2AFDC3A9095ED892' ]
                ]
            }
        },
        agent_keys: {
            '68061AF0C1813884EF11B50A2AFDC3A9095ED892': {
                seq: 2,
                id: '095ED892',
                uri: 'https://joyneop.xyz/_keyring/',
                root: '80690EBD599119050EF943AF037F2FB3D5E2F043'
            }
        }
    }));
};

let getRemotesList__initializeIfNotInitialized = function () {
    try {
        // Build db.json
        let dbjson = fs.readFileSync(`${home}/.tesseract-pgp/db.json`);
        appenv.keyringDB = DBMan.import(dbjson, `${home}/.tesseract-pgp/db.json`);

    } catch (e) {
        init_Database();
        let dbjson = fs.readFileSync(`${home}/.tesseract-pgp/db.json`);
        appenv.keyringDB = DBMan.import(dbjson, `${home}/.tesseract-pgp/db.json`);
    } finally {
    };
    try {
        let remotes_raw = fs.readFileSync(`${home}/.tesseract-pgp/remotes.txt`).toString().trim();
        let remotes_arr = [];
        if (remotes_raw.replace(/\n/g, '') === '') {
            // No remotes
            remotes_arr = [ { type: 'individual', url: 'https://joyneop.xyz/_keyring/' } ];
            fs.writeFileSync(`${home}/.tesseract-pgp/remotes.txt`, 'i>https://joyneop.xyz/_keyring/');
        } else {
            remotes_arr = parseRemotesList(remotes_raw);
        };
        return remotes_arr;
    } catch (e) {
        fs.writeFileSync(`${home}/.tesseract-pgp/remotes.txt`, 'i>https://joyneop.xyz/_keyring/');
        let remotes_arr = [ { type: 'individual', url: 'https://joyneop.xyz/_keyring/' } ];
        return remotes_arr;
    } finally {
    };
};

let parseRemotesList = function (remotes_raw) {
    return remotes_raw.split('\n').map(function (remote) {
        return {
            type: {
                i: 'individual',
                c: 'collection'
            }[remote[0]],
            url: remote.slice(2)
        };
    });
};

let stringifyRemotesList = function (remotes_arr) {
    return remotes_arr.map(function (remote) {
        return remote.type[0] + '>' + remote.url;
    }).join('\n');
};

let leftpad = function (str, len, pad) {
    if (String(str).length >= len) {
        return str;
    } else {
        return (new Array(len-String(str).length)).fill(pad).join('') + str;
    };
};

let constructKeyOrPayloadUri = function (dataObj, queryObj) {
    ndebug('constructKeyOrPayloadUri dataObj');
    ndebug(dataObj);
    var queryObj_sample = {
        type: 'root',
        midfix: 'replacement_chain',
        suffix: 'RC',
        ext: 'txt.asc'
    };
    let template = '{uri}{type}/{midfix}{seq}_{id}{suffix}.{ext}';
    return template.replace('{uri}', dataObj.uri)
                .replace('{type}', queryObj.type + '_keys')
                .replace('{midfix}', queryObj.midfix ? (queryObj.midfix + '/') : '')
                .replace('{seq}', leftpad(dataObj.seq, 4, '0'))
                .replace('{id}', dataObj.id)
                .replace('{suffix}', queryObj.suffix ? ('_' + queryObj.suffix) : '')
                .replace('{ext}', queryObj.ext);
};

// ----------------------------------------------------------------------------

exec(`mkdir ${home}/.tesseract-pgp; mkdir ${home}/.tesseract-pgp/cache; mkdir ${home}/.tesseract-pgp/_keyring; touch ${home}/.tesseract-pgp/remotes.txt; touch ${home}/.tesseract-pgp/db.json`, function () {});
exec(`mkdir ${home}/.tesseract-pgp/_keyring/root_keys; mkdir ${home}/.tesseract-pgp/_keyring/root_keys/replacement_chain; mkdir ${home}/.tesseract-pgp/_keyring/my_followings; mkdir ${home}/.tesseract-pgp/_keyring/agent_keys/; mkdir ${home}/.tesseract-pgp/_keyring/agent_keys/delegation_declarations`, function () {});
console.clear();
console.log( chalk.blue( figlet.textSync('TESSERACT', { horizontalLayout: 'full' }) ) );
console.log('Tesseract v0.1.0 by Neruthes - AGPLv3 - https://github.com/neruthes/tesseract');
console.log('Run `$ tesseract help` for help menu\n');

program.command('help')
.description('Help menu.')
.action(function () {
    console.log(chalk.blue('$ tesseract remotes           ') + ':  List remote repos');
    console.log(chalk.blue('$ tesseract addremote         ') + ':  Subscribe a remote repo');
    console.log(chalk.blue('$ tesseract editremotes       ') + ':  Edit the list of remote repos');
    console.log(chalk.blue('$ tesseract update            ') + ':  Get latest status of keys from remote repos \/\/todo');
    console.log(chalk.blue('$ tesseract addagent          ') + ':  Create an agent key \/\/todo');
    console.log(chalk.blue('$ tesseract revoke            ') + ':  Revoke an agent key \/\/todo');
    console.log(chalk.blue('$ tesseract replace           ') + ':  Replace root key with another \/\/todo');
    console.log(chalk.blue('$ tesseract follow            ') + ':  Publicly follow someone \/\/todo');
    console.log(chalk.blue('$ tesseract unfollow          ') + ':  Publicly unfollow someone \/\/todo');
    console.log(chalk.blue('$ tesseract seturl            ') + ':  Set Git repo URL for my keyring \/\/todo');
    console.log(chalk.blue('$ tesseract push              ') + ':  Push latest updates to my Git server \/\/todo');
});

program.command('addremote')
.description('Subscribe a remote repo.')
.action(async function () {
    let remotes_arr = getRemotesList__initializeIfNotInitialized();
    let remoteDetails = await inquirer.addremote_questions();
    if (remoteDetails.url.split('').reverse()[0] !== '/') {
        remoteDetails.url += '/';
    };
    let remotes_raw = fs.readFileSync(`${home}/.tesseract-pgp/remotes.txt`).toString().trim();
    let remotes_map = new Map();
    remotes_raw.trim().split('\n').map(function (line) {
        remotes_map.set(line, true);
    });
    if (remotes_map.get(remoteDetails.type + '>' + remoteDetails.url)) {
        // Existing repo
        console.log(chalk.green('That repo is already added.'));
    } else {
        remotes_arr.push(remoteDetails);
        fs.writeFileSync(`${home}/.tesseract-pgp/remotes.txt`, stringifyRemotesList(remotes_arr));
        console.log(chalk.green('1 new remote added.'));
    };
});

program.command('remotes')
.description('List remote repos.')
.action(function () {
    let remotes_arr = getRemotesList__initializeIfNotInitialized();
    console.log('List of remote repos now subscribing:\n');
    console.log(remotes_arr.map(function (remote) {
        return chalk.green(remote.type) + '  ' + remote.url;
    }).join('\n'));
});

program.command('editremotes')
.description('Edit the list of remote repos.')
.action(function () {
    let remotes_arr = getRemotesList__initializeIfNotInitialized();
    exec(`open ${home}/.tesseract-pgp/remotes.txt`, function () {
        console.log('Opened file.');
    });
});

program.command('update')
.description('Get latest status of keys from remote repos.')
.action(function () {
    let remotes_arr = getRemotesList__initializeIfNotInitialized();
    var currentlyLoadedRemotes = 0;
    var successfulPulls = 0;
    console.log(chalk.blue('Retrieving upstream repos...'));
    // Get JSON
    remotes_arr.map(function (repo, index) {
        request(repo.url + 'keyring.json', function (err, res, body) {
            currentlyLoadedRemotes += 1;
            if (err) {
                console.log(chalk.red('Failure: ') + repo.url);
            } else {
                try {
                    let json = JSON.parse(body);
                    fs.writeFileSync(`${home}/.tesseract-pgp/cache/fetched_` + index + '.json', JSON.stringify(json));
                    console.log(chalk.green('Success: ') + repo.url);
                    successfulPulls += 1;
                } catch (e) {
                    console.log(chalk.red('Failure: ') + repo.url);
                } finally {
                };
            };
            if (currentlyLoadedRemotes === remotes_arr.length) {
                // Process JSON
                exec(`ls ${home}/.tesseract-pgp/cache | grep fetched`, function (err, stdout, stderr) {
                    console.log(chalk.blue(`\nFetched ${successfulPulls} repo` + (successfulPulls === 1 ? '' : 's') + '.' ));
                    ndebug(stdout);
                    let remoteObjsOnThisPull = stdout.trim().split('\n').map(function (filename) {
                        return JSON.parse(fs.readFileSync(`${home}/.tesseract-pgp/cache/${filename}`).toString().trim());
                    });
                    ndebug(remoteObjsOnThisPull);

                    // Find new root keys
                    let newRootKeys = [];
                    remoteObjsOnThisPull.map(function (remoteObj) {
                        remoteObj.root_keys.list.filter(function (key) {
                            return key.validity !== 'deprecated';
                        }).map(function (rk) {
                            if (!appenv.keyringDB.get('root_keys', rk.fingerprint)) {
                                newRootKeys.push({
                                    baseUri: remoteObj.uri,
                                    seq: rk.index,
                                    fingerprint: rk.fingerprint,
                                });
                            };
                        });
                    });
                    ndebug(chalk.blue('New root keys:'))
                    ndebug(newRootKeys);
                    ndebug('\n\n');
                    // Import new root keys
                    newRootKeys.map(function (rkObj) {
                        ndebug('rkObj');
                        ndebug(rkObj);
                        let rkObj_fingerprint = rkObj.fingerprint;
                        console.log(constructKeyOrPayloadUri(
                            {
                                uri: rkObj.baseUri,
                                seq: rkObj.seq,
                                id: rkObj.fingerprint.match(/[0-9A-F]{8}$/)[0]
                            },
                            {
                                type: 'root',
                                midfix: null,
                                suffix: null,
                                ext: 'asc'
                            }
                        ));
                        exec(
                            `curl -D ${home}/.tesseract-pgp/cache/pubkey_${rkObj_fingerprint}.txt ` + constructKeyOrPayloadUri(
                                {
                                    uri: rkObj.baseUri,
                                    seq: rkObj.seq,
                                    id: rkObj.fingerprint.match(/[0-9A-F]{8}$/)[0]
                                },
                                {
                                    type: 'root',
                                    midfix: null,
                                    suffix: null,
                                    ext: 'asc'
                                }
                            ),
                            function (err, stdout, stderr) {
                                console.log('stdout');
                                console.log(stdout);
                                fs.writeFileSync(`${home}/.tesseract-pgp/cache/pubkey_${rkObj_fingerprint}.txt`, stdout);
                                exec(`gpg --import ${home}/.tesseract-pgp/cache/pubkey_${rkObj_fingerprint}.txt > ${home}/.tesseract-pgp/cache/gpgimportlog_pubkey_${rkObj_fingerprint}.txt`, function (err, stdout, stderr) {
                                    console.log(stdout);
                                });
                            }
                        );
                    });

                    // Find new agent keys
                    let newAgentKeys = [];
                    remoteObjsOnThisPull.map(function (remoteObj) {
                        remoteObj.agent_keys.list.map(function (ak) {
                            if (!appenv.keyringDB.get(ak.fingerprint)) {
                                newAgentKeys.push({
                                    baseUri: remoteObj.uri,
                                    seq: ak.index,
                                    fingerprint: ak.fingerprint,
                                    root: ak.root,
                                });
                            };
                        });
                    });
                    // Get Create-Agent payloads
                    newAgentKeys.map(function (akObj) {

                    });
                });
            };
        });
    });
});


program.command('refresh')
.description('Refresh local objects.')
.action(function () {
    let remotes_arr = getRemotesList__initializeIfNotInitialized();
    console.log(chalk.green('Refreshed.'));
});

program.parse(process.argv);
