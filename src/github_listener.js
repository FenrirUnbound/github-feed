/*jslint nomen: true*/
var util = require('util'),
    events = require('events'),
    GitHub = require('github');

/**
 * GitHub Listener
 *
 * Connects to GitHub and listens for events on organizations
 *
 * @param {Object} options
 * @param {String} options.token Token to authenticate to GitHub
 * @param {Object} options.orgs HashMap of Orgs to listen to and event_ids
 * @param {String} options.ignoreRepos Repositories to ignore
 * @param {String} options.ignoreEvents Events to ignore
 * @param {String} options.githubHost GitHub Host
 * @param {String} options.githubApiHost GitHub API Host
 * @param {String} options.githubApiPath GitHub API URL
 * @param {Int} options.delay Delay between polls in n milliseconds
 */
function GitHubListener(options) {
    var me = this;
    events.EventEmitter.call(me);

    options = options || {};
    this._delay = options.delay || 60000;
    this._ignoreEvents = options.ignoreEvents || [];
    this._ignoreRepos = options.ignoreRepos || [];
    this._orgs = options.orgs || {};
    this._githubHost = options.githubHost || '';
    this._github = new GitHub({
        version: '3.0.0',
        host: options.githubApiHost,
        url: options.githubApiPath,
        timeout: 5000
    });

    this._github.authenticate({
        type: 'oauth',
        token: options.token
    });

    this._parseEvents = function (error, events) {
        if (error) {
            me.emit('error', error);
            return;
        }
        events.reverse().forEach(function (event) {
            var org = event.org.login,
                repo = event.repo.name,
                type = event.type;
            if (me._ignoreRepos.indexOf(repo) > -1) {
                return;
            }
            if (me._ignoreEvents.indexOf(type) > -1) {
                return;
            }
            event.hostname = 'http://' + me._githubHost + '/';
            if (event.id > me._orgs[org]) {
                me._orgs[org] = event.id;
                me.emit('event', event);
            }
        });
    };

    this._checkForEvents = function () {
        Object.keys(me._orgs).forEach(function (org) {
            me._github.events.getFromOrg({org: org}, me._parseEvents);
        });
    };

    setInterval(me._checkForEvents, me._delay);
    me._checkForEvents();
}

util.inherits(GitHubListener, events.EventEmitter);

module.exports = GitHubListener;
