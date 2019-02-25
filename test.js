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

let appenv = {};

// ----------------------------------------------------------------------------

let leftpad = function (str, len, pad) {
    if (String(str).length >= len) {
        return str;
    } else {
        return (new Array(len-String(str).length)).fill(pad).join('') + str;
    };
};

let constructKeyOrPayloadUri = function (dataObj, queryObj) {
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

let dbJsonRaw = fs.readFileSync(`${home}/.tesseract-pgp/db.json`).toString();
appenv.keyringDB = DBMan.import(dbJsonRaw);

let fingerprint = '68061AF0C1813884EF11B50A2AFDC3A9095ED892';
exec(
    `curl -D ${home}/.tesseract-pgp/cache/pubkey_${fingerprint}.txt ` + constructKeyOrPayloadUri(
        appenv.keyringDB.get('agent_keys', fingerprint),
        {
            type: 'agent',
            midfix: null,
            suffix: null,
            ext: 'asc'
        }
    ) + '',
    function (err, stdout, stderr) {
        console.log(stdout);
        fs.writeFileSync(`${home}/.tesseract-pgp/cache/pubkey_${fingerprint}.txt`, stdout);
        exec(`gpg --import ${home}/.tesseract-pgp/cache/pubkey_${fingerprint}.txt > ${home}/.tesseract-pgp/cache/gpgimportlog_pubkey_${fingerprint}.txt`, function (err, stdout, stderr) {
            console.log(stdout);
        });
    }
);
