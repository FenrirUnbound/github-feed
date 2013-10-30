var Y = require('yuitest'),
    Assert = Y.Assert,
    mockery = require('mockery'),
    fs = require('fs'),
    src = '../src/notifier',
    notifier,
    notifications = [];

function loadMock(name) {
    var event = JSON.parse(fs.readFileSync(process.cwd() + '/test/mocks/' + name + '.json'));
    event.hostname = 'http://github.com/';
    return event;
}

Y.TestRunner.add(new Y.TestCase({
    name: 'Notifier',

    setUp: function () {
        mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
        });
        mockery.registerMock('osx-notifier', function (data) {
            notifications.push(data);
        });
        notifications = [];
        notifier = require(src);
    },

    tearDown: function () {
        mockery.disable();
        mockery.deregisterAll();
    },

    'can send notification to osx': function () {
        notifier.send(loadMock('CreateEvent'));
        Assert.areEqual(1, notifications.length, 'Notify was called');
        Assert.areEqual('{"type":"info","title":"FakeOrg/FakeRepo branch Created","open":"http' +
            '://github.com/FakeOrg/FakeRepo","message":"fakeuser created a branch(mast' +
            'er) at FakeOrg/FakeRepo"}',
            JSON.stringify(notifications.pop()),
            'Notification was called correctly');
    },

    'will not send bad notifications to osx': function () {
        notifier.send({'foo': 'bar'});
        Assert.areEqual(0, notifications.length, 'Notify was not called');
    }
}));