/*jslint nomen: true*/
var Y = require('yuitest'),
    Assert = Y.Assert,
    mockery = require('mockery'),
    src = '../src/github_feed',
    mockEvents = [],
    nconfOverride = {},
    github_feed;

Y.TestRunner.add(new Y.TestCase({
    name: 'GitHub Feed',

    setUp: function () {
        mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
        });
        mockery.registerMock('daemon', function () {
            mockEvents.push(JSON.stringify({'daemon': ''}));
        });
        mockery.registerMock('nconf', {
            keys: {},
            file: function (filename) {
                var me = this;
                mockEvents.push(JSON.stringify({'nconf:file': filename}));
                Object.keys(nconfOverride).forEach(function (key) {
                    me.keys[key] = nconfOverride[key];
                });
                return this;
            },
            defaults: function (options) {
                var me = this;
                if (options.pid) {
                    options.pid = 9000;
                }
                mockEvents.push(JSON.stringify({'nconf:defaults': options}));
                Object.keys(options).forEach(function (key) {
                    if (typeof me.keys[key] === 'undefined') {
                        me.keys[key] = options[key];
                    }
                });
                return this;
            },
            save: function () {
                mockEvents.push(JSON.stringify({'nconf:save': ''}));
                return this;
            },
            set: function (key, value) {
                if (key === 'pid') {
                    value = 9001;
                }
                mockEvents.push(JSON.stringify({'nconf:set': [key, value]}));
                return this;
            },
            get: function (key) {
                mockEvents.push(JSON.stringify({'nconf:get': key}));
                return this.keys[key];
            }
        });
        mockery.registerMock('./notifier', {
            send: function (data) {
                mockEvents.push(JSON.stringify({'notifier:send': data}));
            }
        });
        mockery.registerMock('./github_listener', function (options) {
            mockEvents.push(JSON.stringify({'listener:create': options}));
            this.on = function (event, callback) {
                mockEvents.push(JSON.stringify({'listener:on': event}));
                callback('dummy data');
            };
        });
        mockery.registerMock('./sleepy_queue', function (options) {
            mockEvents.push(JSON.stringify({'queue:create': options}));
            this.on = function (data, callback) {
                mockEvents.push(JSON.stringify({'queue:on': data}));
                callback({
                    org: {
                        login: 'fooLogin'
                    },
                    id: 9001
                });
            };
            this.push = function (data) {
                mockEvents.push(JSON.stringify({'queue:push': data}));
            };
        });

        mockEvents = [];

        github_feed = require(src);
    },

    tearDown: function () {
        mockery.disable();
        mockery.deregisterAll();
    },

    'can start system': function () {
        var expectedEvents = [
            '{"nconf:file":{"file":"settings.json"}}',
            '{"nconf:defaults":{"token":"","orgs":{},"github_host":"github.com","github_api_host":"api.github.com","github_api_path":"","ignore_repos":[],"ignore_events":[],"daemon":false,"pid":9000}}',
            '{"queue:create":{"delay":3000}}',
            '{"nconf:get":"token"}',
            '{"nconf:get":"orgs"}',
            '{"nconf:get":"ignore_repos"}',
            '{"nconf:get":"ignore_events"}',
            '{"nconf:get":"github_host"}',
            '{"nconf:get":"github_api_host"}',
            '{"nconf:get":"github_api_path"}',
            '{"listener:create":{"token":"","orgs":{},"ignoreRepos":[],"ignoreEvents":[],"githubHost":"github.com","githubApiHost":"api.github.com","githubApiPath":""}}',
            '{"listener:on":"error"}',
            '{"listener:on":"event"}',
            '{"queue:push":"dummy data"}',
            '{"queue:on":"pop"}',
            '{"notifier:send":{"org":{"login":"fooLogin"},"id":9001}}',
            '{"queue:on":"pop"}',
            '{"nconf:set":["orgs:fooLogin",9001]}',
            '{"nconf:save":""}',
            '{"nconf:get":"daemon"}'
        ];
        github_feed.start();

        Assert.areEqual(expectedEvents.length, mockEvents.length, 'Events were sent in');
        expectedEvents.forEach(function (event, index) {
            Assert.areEqual(event, mockEvents[index], 'Mock #' + index + ' is correct');
        });
    },

    'can start system as daemon': function () {
        var expectedEvents = [
            '{"nconf:file":{"file":"settings.json"}}',
            '{"nconf:defaults":{"token":"","orgs":{},"github_host":"github.com","github_api_host":"api.github.com","github_api_path":"","ignore_repos":[],"ignore_events":[],"daemon":false,"pid":9000}}',
            '{"queue:create":{"delay":3000}}',
            '{"nconf:get":"token"}',
            '{"nconf:get":"orgs"}',
            '{"nconf:get":"ignore_repos"}',
            '{"nconf:get":"ignore_events"}',
            '{"nconf:get":"github_host"}',
            '{"nconf:get":"github_api_host"}',
            '{"nconf:get":"github_api_path"}',
            '{"listener:create":{"token":"","orgs":{},"ignoreRepos":[],"ignoreEvents":[],"githubHost":"github.com","githubApiHost":"api.github.com","githubApiPath":""}}',
            '{"listener:on":"error"}',
            '{"listener:on":"event"}',
            '{"queue:push":"dummy data"}',
            '{"queue:on":"pop"}',
            '{"notifier:send":{"org":{"login":"fooLogin"},"id":9001}}',
            '{"queue:on":"pop"}',
            '{"nconf:set":["orgs:fooLogin",9001]}',
            '{"nconf:save":""}',
            '{"nconf:get":"daemon"}',
            '{"daemon":""}',
            '{"nconf:set":["pid",9001]}',
            '{"nconf:save":""}'
        ];
        nconfOverride.daemon = true;
        github_feed.start();

        Assert.areEqual(expectedEvents.length, mockEvents.length, 'Events were sent in');
        expectedEvents.forEach(function (event, index) {
            Assert.areEqual(event, mockEvents[index], 'Mock #' + index + ' is correct');
        });
    },

    'can make changes': function () {
        var expectedEvents = [
            '{"nconf:file":{"file":"settings.json"}}',
            '{"nconf:defaults":{"token":"","orgs":{},"github_host":"github.com","github_api_host":"api.github.com","github_api_path":"","ignore_repos":[],"ignore_events":[],"daemon":false,"pid":9000}}',
            '{"nconf:set":["token","test"]}',
            '{"nconf:save":""}',
            '{"nconf:set":["daemon",false]}',
            '{"nconf:save":""}',
            '{"nconf:set":["orgs",["test0"]]}',
            '{"nconf:save":""}',
            '{"nconf:set":["ignore_repos",["test1"]]}',
            '{"nconf:save":""}',
            '{"nconf:set":["ignore_events",["test2"]]}',
            '{"nconf:save":""}',
            '{"nconf:set":["github_host","test3"]}',
            '{"nconf:save":""}',
            '{"nconf:set":["github_api_host","test4"]}',
            '{"nconf:save":""}',
            '{"nconf:set":["github_api_path","test5"]}',
            '{"nconf:save":""}',
            '{"nconf:get":"token"}',
            '{"nconf:get":"daemon"}',
            '{"nconf:get":"orgs"}',
            '{"nconf:get":"ignore_repos"}',
            '{"nconf:get":"ignore_events"}',
            '{"nconf:get":"github_host"}',
            '{"nconf:get":"github_api_host"}',
            '{"nconf:get":"github_api_path"}'
        ];
        github_feed.set({
            token: 'test',
            daemon: 'false',
            orgs: '["test0"]',
            ignore_repos: '["test1"]',
            ignore_events: '["test2"]',
            github_host: 'test3',
            github_api_host: 'test4',
            github_api_path: 'test5',
            junk: ''
        });

        Assert.areEqual(expectedEvents.length, mockEvents.length, 'Events were sent in');
        expectedEvents.forEach(function (event, index) {
            Assert.areEqual(event, mockEvents[index], 'Mock #' + index + ' is correct');
        });
    }
}));