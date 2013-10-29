var gh_api = require('github'),
    growler = require('growler'),
    settings = require('cat-settings').loadSync(__dirname + '/settings.json'),
    fs = require('fs'),
    growl_app = new growler.GrowlApplication('GitHub Notifications'),
    github = new gh_api({
        version: '3.0.0',
        host: 'git.corp.yahoo.com',
        url: '/api/v3',
        timeout: 5000
    }),
    CONST_GIT = 'http://git.corp.yahoo.com/',
    queue = [],
    notifying = false;

if (typeof settings.token === 'undefined') {
    settings.token = '';
}
if (typeof settings.orgs === 'undefined') {
    settings.orgs = {};
}
if (typeof settings.ignore === 'undefined') {
    settings.ignore = [];
}
if (typeof settings.daemon === 'undefined') {
    settings.daemon = true;
}
settings.saveSync();

github.authenticate({
     type: 'oauth',
    token: settings.token
});
growl_app.setNotifications({
    'PushEvent': {},
    'CreateEvent': {},
    'PullRequestEvent': {},
    'PullRequestReviewCommentEvent': {},
    'DeleteEvent': {},
    'IssueCommentEvent': {},
    'ForkEvent': {},
    'CommitCommentEvent': {},
    'WatchEvent': {},
    'GollumEvent': {}
});
growl_app.register();

// Jump into daemon mode
if (settings.daemon) {
    require('daemon')();
    fs.writeFile(__dirname + '/node.pid', process.pid);
}

function checkForUpdates() {
    try {
        Object.keys(settings.orgs).forEach(function(org) {
            github.events.getFromOrg({
                    org: org
                }, findChanges
            );
        });
    } catch (err) {
        console.error(err);
    }
}

function queueNotification(type, data) {
    // Skip empty notifications
    if (!data) {
        return;
    }

    if (notifying) {
        queue.push([type, data]);
    } else {
        notifying = true;
        growl_app.sendNotification(type, data, popQueue);
    }
}

function popQueue(success, error) {
    if (success) {
        if (queue.length > 0) {
            sendQueue();
        } else {
            notifying = false;
        }
    } else {
        console.error('Error sending data to Growl', error);
        sendQueue();
    }
}

function sendQueue() {
    var next = queue.shift();
    growl_app.sendNotification(next[0], next[1], popQueue);
}

function findChanges(e, events) {
    var updates = 0;

    if (events) {
        events.reverse().forEach(function (event) {
            if (event.id > settings.orgs[event.org.login]) {
                settings.orgs[event.org.login] = event.id;
                settings.save();
                updates++;
                queueNotification(event.type, generateData(event));
            }
        });
    } else {
        console.error(e);
    }
}

function generateData(event) {
    var actor = event.actor.login,
        repo = event.repo.name,
        notice = {
            title: '',
            text: '',
            priority: 0,
            url: ''
        };

    if (settings.ignore.indexOf(repo) !== -1) {
        return;
    }
    switch (event.type) {
        case 'PullRequestEvent':
            var pr = event.payload.pull_request,
                action = (pr.merged ? 'merged' : event.payload.action);

            notice.priority = 1;
            notice.title = repo + ' Pull Request #' + pr.number + ' ' + action;
            notice.url = pr.html_url;
            notice.text = pr.title + '\n';
            notice.text += actor + ' ' + action + ' pull request ' + repo + '#' + pr.number + '\n\n';
            notice.text += pr.commits + ' commit(s) with ' + pr.additions + ' additions and ' + pr.deletions + ' deletions';
            break;

        case 'IssueCommentEvent':
            notice.priority = 0;
            notice.title = repo + ' Pull Request #' + event.payload.issue.number + ' commented';
            notice.url = event.payload.issue.html_url;
            notice.text = actor + ' commented on pull request ' + repo + '#' + event.payload.issue.number + '\n\n';
            notice.text += event.payload.comment.body;
            break;

        case 'PullRequestReviewCommentEvent':
            var pr_number = event.payload.comment.pull_request_url.substring(
                    event.payload.comment.pull_request_url.lastIndexOf('/') + 1
                );
            notice.priority = 0;
            notice.title = repo + ' Pull Request #' + pr_number + ' commented';
            notice.url = event.payload.comment.html_url;
            notice.text = actor + ' commented on pull request ' + repo + '#' + pr_number + '\n\n';
            notice.text += event.payload.comment.body;
            break;

        case 'CommitCommentEvent':
            var commit = event.payload.comment.commit_id.substr(0,7);
            notice.priority = 0;
            notice.title = repo + ' ' + commit + ' commented';
            notice.url = event.payload.comment.html_url;
            notice.text = actor + ' commented on commit ' + repo + '@' + commit + '\n\n';
            notice.text += event.payload.comment.body;
            break;

        case 'CreateEvent':
            notice.priority = 0;
            notice.title = repo + ' ' + event.payload.ref_type + ' Created';
            notice.url = CONST_GIT + repo;
            notice.text = actor + ' created a ' + event.payload.ref_type;
            if (event.payload.ref_type === 'branch') {
                notice.text += '(' + event.payload.ref + ')';
                notice.url += '/branches/';
            }
            notice.text += ' at ' + repo;
            break;

        case 'DeleteEvent':
            notice.priority = 0;
            notice.title = repo + ' ' + event.payload.ref_type + ' Deleted';
            notice.url = CONST_GIT + repo + '/branches/';
            notice.text = actor + ' deleted a ' + event.payload.ref_type;
            if (event.payload.ref_type === 'branch') {
                notice.text += '(' + event.payload.ref + ')';
            }
            notice.text += ' at ' + repo;
            break;

        case 'PushEvent':
            var branch = event.payload.ref.replace(/^refs\/heads\//, '');

            notice.priority = 0;
            notice.title = repo + ' Code Push';
            notice.url = CONST_GIT + repo + '/commits/' + branch;
            notice.text = actor + ' pushed to ' + branch + ' at ' + repo + '\n\n';
            event.payload.commits.forEach(function(commit) {
                notice.text += commit.sha.substr(0,7) + ' ' + commit.message;
            });
            break;

        case 'ForkEvent':
            notice.priority = -2;
            notice.title = repo + ' Forked';
            notice.url = event.payload.forkee.html_url;
            notice.text = actor + ' forked the ' + repo + ' repository';
            break;

        case 'WatchEvent':
            notice.priority = -2;
            notice.title = repo + ' Watched';
            if (event.payload.repo && event.payload.repo.url) {
                notice.url = event.payload.repo.url;
            }
            notice.text = actor + ' watched the ' + repo + ' repository';
            break;

        case 'GollumEvent':
            if (event.payload.pages.length === 0) {
                return;
            }
            var page = event.payload.pages[0];
            notice.priority = -1;
            notice.title = repo + ' Wiki Updated';
            notice.url = page.html_url;
            notice.text = actor + ' updated the ' + page.title + ' page';
            break;
    }

    return notice;
}

setInterval(checkForUpdates, 60000);
checkForUpdates();