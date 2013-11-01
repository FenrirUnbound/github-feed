var Y = require('yuitest'),
    Assert = Y.Assert,
    src = '../src/sleepy_queue',
    SleepyQueue;

Y.TestRunner.add(new Y.TestCase({
    name: 'Sleepy Queue',

    setUp: function () {
        SleepyQueue = require(src);
    },

    'can create new queue': function () {
        var queue = new SleepyQueue();

        Assert.isNotNull(queue);
    },

    'can add items to the queue': function () {
        var queue = new SleepyQueue();

        Assert.isNotNull(queue);
        Assert.areEqual(0, queue.length());

        queue.push('foo');
        queue.push('bar');
        Assert.areEqual(2, queue.length());
    },

    'can emit items out of the queue': function () {
        var test = this,
            queue = new SleepyQueue(),
            received;

        queue.on('pop', function (item) {
            received = item;
        });

        queue.push('foo');
        Assert.areEqual(1, queue.length());

        test.wait(function () {
            Assert.areEqual(0, queue.length(), 'Queue is empty');
            Assert.areEqual('foo', received, 'Item came back correctly');
        }, 100);
    },

    'can configure delay of emitting': function () {
        var test = this,
            queue = new SleepyQueue({
                delay: 200
            }),
            received;

        queue.on('pop', function (item) {
            received = item;
        });

        queue.push('foo');
        Assert.areEqual(1, queue.length());

        test.wait(function () {
            Assert.areEqual(1, queue.length(), 'Queue is still full');
            Assert.isUndefined(received, 'Item has not come back yet');
            test.wait(function () {
                Assert.areEqual(0, queue.length(), 'Queue is empty');
                Assert.areEqual('foo', received, 'Item came back correctly');
            }, 110);
        }, 100);
    }
}));