#!/usr/bin/env node

process.on('uncaughtException', function (err) {
    console.error('Caught exception: ' + err);
});

var github_feed = require('../src/github_feed.js'),
    optimist = require('optimist');

optimist.usage('Feed GitHub events into OS X Notification Center\n\nUsage: $0')
    .boolean('start').describe('start', 'Start the service')
    .boolean('stop').describe('stop', 'Stop the service')
    .describe('set[.setting]=[value]', 'Set/view settings');

if (optimist.argv.start) {
    github_feed.start();
} else if (optimist.argv.stop) {
    github_feed.stop();
} else if (optimist.argv.set) {
    github_feed.set(optimist.argv.set);
} else {
    optimist.showHelp();
}
