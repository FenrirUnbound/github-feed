var notify = require('osx-notifier'),
    github_notification = require('./github_notification');

function sendOSX(notification) {
    notification.message = notification.message.replace('[', '\\[').replace(']', '\\]');
    notify({
        type: 'info',
        title: notification.title,
        open: notification.link,
        message: notification.message
    });
}

module.exports = {
    /**
     * Sends the notification to Growl or Notification Center
     *
     * @param {Object} github_event
     */
    send: function (github_event) {
        var notification = github_notification.parse(github_event);

        if (notification) {
            sendOSX(notification);
        }
    }
};
