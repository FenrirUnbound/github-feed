var events = {};

events.PullRequestEvent = function (event, repo, actor, payload, hostname) {
    var pr = payload.pull_request,
        action = (pr.merged ? 'merged' : payload.action);

    this.title = repo + ' Pull Request #' + pr.number + ' ' + action;
    this.message = pr.title + ' \n';
    this.message += actor + ' ' + action + ' pull request ' +
        repo + '#' + pr.number + '\n \n';
    this.message += pr.commits + ' commit(s) with ' + pr.additions +
        ' additions and ' + pr.deletions + ' deletions';
    this.link = pr.html_url;
};

events.IssueCommentEvent = function (event, repo, actor, payload, hostname) {
    this.title = repo + ' Pull Request #' + payload.issue.number + ' commented';
    this.message = actor + ' commented on pull request ' + repo + '#' + payload.issue.number + '\n \n';
    this.message += payload.comment.body;
    this.link = payload.issue.html_url;
};

events.PullRequestReviewCommentEvent = function (event, repo, actor, payload, hostname) {
    var pr_number = payload.comment.pull_request_url.substring(
            payload.comment.pull_request_url.lastIndexOf('/') + 1
        );

    this.title = repo + ' Pull Request #' + pr_number + ' commented';
    this.message = actor + ' commented on pull request ' + repo + '#' + pr_number + '\n \n';
    this.message += payload.comment.body;
    this.link = payload.comment.html_url;
};

events.CommitCommentEvent = function (event, repo, actor, payload, hostname) {
    var commit = payload.comment.commit_id.substr(0, 7);

    this.title = repo + ' ' + commit + ' commented';
    this.message = actor + ' commented on commit ' + repo + '@' + commit + '\n \n';
    this.message += payload.comment.body;
    this.link = payload.comment.html_url;
};

events.CreateEvent = function (event, repo, actor, payload, hostname) {
    this.title = repo + ' ' + payload.ref_type + ' Created';
    this.message = actor + ' created a ' + payload.ref_type;
    if (payload.ref_type === 'branch') {
        this.message += '(' + payload.ref + ')';
        this.link += '/branches/';
    }
    this.message += ' at ' + repo;
    this.link = hostname + repo;
};

events.DeleteEvent = function (event, repo, actor, payload, hostname) {
    this.title = repo + ' ' + payload.ref_type + ' Deleted';
    this.message = actor + ' deleted a ' + payload.ref_type;
    if (payload.ref_type === 'branch') {
        this.message += '(' + payload.ref + ')';
    }
    this.message += ' at ' + repo;
    this.link = hostname + repo + '/branches/';
};

events.PushEvent = function (event, repo, actor, payload, hostname) {
    var branch = payload.ref.replace(/^refs\/heads\//, '');

    this.title = repo + ' Code Push';
    this.message = actor + ' pushed to ' + branch + ' at ' + repo + '\n \n';
    payload.commits.forEach(function (commit) {
        this.message += commit.sha.substr(0, 7) + ' ' + commit.message + '\n';
    });
    this.link = hostname + repo + '/commits/' + branch;
};

events.ForkEvent = function (event, repo, actor, payload, hostname) {
    this.title = repo + ' Forked';
    this.message = actor + ' forked the ' + repo + ' repository';
    this.link = payload.forkee.html_url;
};

events.WatchEvent = function (event, repo, actor, payload, hostname) {
    this.title = repo + ' Watched';
    this.message = actor + ' watched the ' + repo + ' repository';
    this.url = '';
    if (payload.repo && payload.repo.url) {
        this.url = payload.repo.url;
    }
};

events.GollumEvent = function (event, repo, actor, payload, hostname) {
    if (payload.pages.length === 0) {
        return;
    }
    var page = payload.pages[0];

    this.title = repo + ' Wiki Updated';
    this.link = page.html_url;
    this.message = actor + ' updated the ' + page.title + ' page';
};

module.exports = {
    /**
     * Converts raw events into an object for notifications
     *
     * @param {Object} event GitHub Event Object
     */
    parse: function (event, hostname) {
        var object;
        if (event && events[event.type]) {
            object = new events[event.type](event, event.repo.name, event.actor.login, event.payload, event.hostname);
        } else {
            console.error(event);
        }
        return object;
    }
};
