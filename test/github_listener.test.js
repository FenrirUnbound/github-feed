/*jslint nomen: true*/
var Y = require('yuitest'),
    Assert = Y.Assert,
    mockery = require('mockery'),
    src = '../src/github_listener',
    mockEvents = [],
    GitHubListener;

Y.TestRunner.add(new Y.TestCase({
    name: 'GitHub Listener',

    setUp: function () {
        mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
        });
        mockery.registerMock('github', function (options) {
            mockEvents.push(JSON.stringify({'new': options}));
            this.authenticate = function (options) {
                mockEvents.push(JSON.stringify({'authenticate': options}));
            };
            this.events = {};
            this.events.getFromOrg = function (options, callback) {
                mockEvents.push(JSON.stringify({'getFromOrg': options}));
                callback(null, []);
            };
        });
        mockEvents = [];

        GitHubListener = require(src);
    },

    tearDown: function () {
        mockery.disable();
        mockery.deregisterAll();
    },

    'can create listener': function () {
        var listener = new GitHubListener({
            token: 'testToken'
        });
        Assert.areEqual(2, mockEvents.length, 'Events were sent in');
        Assert.areEqual('{"new":{"version":"3.0.0","timeout":5000}}', mockEvents[0], 'New was called');
        Assert.areEqual('{"authenticate":{"type":"oauth","token":"testToken"}}', mockEvents[1], 'Authenticate was called');
    },

    'can load from orgs': function () {
        var listener = new GitHubListener({
            orgs: {
                'fooOrg': 0,
                'barOrg': 50
            }
        });
        Assert.areEqual(4, mockEvents.length, 'Events were sent in');
        Assert.areEqual('{"new":{"version":"3.0.0","timeout":5000}}', mockEvents[0], 'New was called');
        Assert.areEqual('{"authenticate":{"type":"oauth"}}', mockEvents[1], 'Authenticate was called');
        Assert.areEqual('{"getFromOrg":{"org":"fooOrg"}}', mockEvents[2], 'GetFromOrg was called');
        Assert.areEqual('{"getFromOrg":{"org":"barOrg"}}', mockEvents[3], 'GetFromOrg was called');
    },

    'can parse incoming events': function () {
        var listener = new GitHubListener({
            orgs: {
                'fooOrg': 0
            }
        });
        listener.on('error', function (message) {
            mockEvents.push(JSON.stringify({'error': message}));
        });
        listener.on('event', function (message) {
            mockEvents.push(JSON.stringify({'event': message}));
        });
        listener._parseEvents(null, [
            {
                org: {
                    login: 'fooOrg'
                },
                repo: {
                    name: 'fooRepo'
                },
                id: 50
            }
        ]);

        Assert.areEqual(4, mockEvents.length, 'Events were sent in');
        Assert.areEqual('{"new":{"version":"3.0.0","timeout":5000}}', mockEvents[0], 'New was called');
        Assert.areEqual('{"authenticate":{"type":"oauth"}}', mockEvents[1], 'Authenticate was called');
        Assert.areEqual('{"getFromOrg":{"org":"fooOrg"}}', mockEvents[2], 'GetFromOrg was called');
        Assert.areEqual('{"event":{"org":{"login":"fooOrg"},"repo":{"name":"fooRepo"},"id":50,"hostname":"http:///"}}', mockEvents[3], 'Event was emitted');
        Assert.areEqual(50, listener._orgs.fooOrg, 'ID was updated');
    },

    'will skip old events': function () {
        var listener = new GitHubListener({
            orgs: {
                'fooOrg': 10
            }
        });
        listener.on('error', function (message) {
            mockEvents.push(JSON.stringify({'error': message}));
        });
        listener.on('event', function (message) {
            mockEvents.push(JSON.stringify({'event': message}));
        });
        listener._parseEvents(null, [
            {
                org: {
                    login: 'fooOrg'
                },
                repo: {
                    name: 'fooRepo'
                },
                id: 9
            }
        ]);

        Assert.areEqual(3, mockEvents.length, 'Events were sent in');
        Assert.areEqual('{"new":{"version":"3.0.0","timeout":5000}}', mockEvents[0], 'New was called');
        Assert.areEqual('{"authenticate":{"type":"oauth"}}', mockEvents[1], 'Authenticate was called');
        Assert.areEqual('{"getFromOrg":{"org":"fooOrg"}}', mockEvents[2], 'GetFromOrg was called');
        Assert.areEqual(10, listener._orgs.fooOrg, 'ID was not updated');
    },

    'will skip ignored repositories': function () {
        var listener = new GitHubListener({
            orgs: {
                'fooOrg': 10
            },
            ignoreRepos: ['fooRepo']
        });
        listener.on('error', function (message) {
            mockEvents.push(JSON.stringify({'error': message}));
        });
        listener.on('event', function (message) {
            mockEvents.push(JSON.stringify({'event': message}));
        });
        listener._parseEvents(null, [
            {
                org: {
                    login: 'fooOrg'
                },
                repo: {
                    name: 'fooRepo'
                },
                id: 15
            }
        ]);

        Assert.areEqual(3, mockEvents.length, 'Events were sent in');
        Assert.areEqual('{"new":{"version":"3.0.0","timeout":5000}}', mockEvents[0], 'New was called');
        Assert.areEqual('{"authenticate":{"type":"oauth"}}', mockEvents[1], 'Authenticate was called');
        Assert.areEqual('{"getFromOrg":{"org":"fooOrg"}}', mockEvents[2], 'GetFromOrg was called');
        Assert.areEqual(10, listener._orgs.fooOrg, 'ID was not updated');
    },

    'will skip ignored events': function () {
        var listener = new GitHubListener({
            orgs: {
                'fooOrg': 10
            },
            ignoreEvents: ['banana']
        });
        listener.on('error', function (message) {
            mockEvents.push(JSON.stringify({'error': message}));
        });
        listener.on('event', function (message) {
            mockEvents.push(JSON.stringify({'event': message}));
        });
        listener._parseEvents(null, [
            {
                type: 'banana',
                org: {
                    login: 'fooOrg'
                },
                repo: {
                    name: 'fooRepo'
                },
                id: 15
            }
        ]);

        Assert.areEqual(3, mockEvents.length, 'Events were sent in');
        Assert.areEqual('{"new":{"version":"3.0.0","timeout":5000}}', mockEvents[0], 'New was called');
        Assert.areEqual('{"authenticate":{"type":"oauth"}}', mockEvents[1], 'Authenticate was called');
        Assert.areEqual('{"getFromOrg":{"org":"fooOrg"}}', mockEvents[2], 'GetFromOrg was called');
        Assert.areEqual(10, listener._orgs.fooOrg, 'ID was not updated');
    },

    'will catch errors from GitHub responses': function () {
        var listener = new GitHubListener();
        listener.on('error', function (message) {
            mockEvents.push(JSON.stringify({'error': message}));
        });
        listener.on('event', function (message) {
            mockEvents.push(JSON.stringify({'event': message}));
        });
        listener._parseEvents('Failure to connect', []);

        Assert.areEqual(3, mockEvents.length, 'Events were sent in');
        Assert.areEqual('{"new":{"version":"3.0.0","timeout":5000}}', mockEvents[0], 'New was called');
        Assert.areEqual('{"authenticate":{"type":"oauth"}}', mockEvents[1], 'Authenticate was called');
        Assert.areEqual('{"error":"Failure to connect"}', mockEvents[2], 'GetFromOrg was called');
    }
}));