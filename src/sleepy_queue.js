/*jslint nomen: true*/
var util = require('util'),
    events = require('events');

/**
 * Sleepy Queue
 *
 * Delayable queue, will emit an object after n milliseconds
 * @param {Object} options
 * @param {Int} options.delay Delay between pops in n milliseconds
 */
function SleepyQueue(options) {
    var me = this;
    events.EventEmitter.call(me);

    if (!options) {
        options = {};
    }

    this._delay = options.delay || 50;
    this._queue = [];
    this.length = function () {
        return me._queue.length;
    };
    this.push = function (item) {
        me._queue.push(item);
    };

    setInterval(function () {
        if (me.length() > 0) {
            me.emit('pop', me._queue.shift());
        }
    }, me._delay);
}

util.inherits(SleepyQueue, events.EventEmitter);

module.exports = SleepyQueue;
