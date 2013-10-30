var Y = require('yuitest'),
    Assert = Y.Assert,
    fs = require('fs'),
    src = '../src/github_notification',
    github_notification;

function loadMock(name) {
    return JSON.parse(fs.readFileSync(process.cwd() + '/test/mocks/' + name + '.json'));
}

Y.TestRunner.add(new Y.TestCase({
    name: 'GitHub Notification',

    setUp: function () {
        github_notification = require(src);
    },

    'can create new notification': function () {
        var notification = github_notification.parse();

        Assert.isNotNull(notification);
    },

    'can create a pull request notification': function () {
        var notification = github_notification.parse(loadMock('PullRequestEvent'));

        Assert.isNotNull(notification);
        Assert.areEqual('FakeOrg/FakeRepo Pull Request #14 merged', notification.title);
        Assert.areEqual('Fake Pull Request \nfakeuser2 merged pull request FakeOrg/FakeRepo#14\n \n3 commit(s) with 8 additions and 1 deletions', notification.message);
        Assert.areEqual('https://github.com/FakeOrg/FakeRepo/pull/14', notification.link);
    },

    'can create an issue comment notification': function () {
        var notification = github_notification.parse(loadMock('IssueCommentEvent'));

        Assert.isNotNull(notification);
        Assert.areEqual('FakeOrg/FakeRepo Pull Request #23 commented', notification.title);
        Assert.areEqual('fakeuser commented on pull request FakeOrg/FakeRepo#23\n \nLooks like all feedback from #22 is incorporated. :+1: ', notification.message);
        Assert.areEqual('https://github.com/FakeOrg/FakeRepo/issues/23', notification.link);
    },

    'can create a pull request comment notification': function () {
        var notification = github_notification.parse(loadMock('PullRequestReviewCommentEvent'));

        Assert.isNotNull(notification);
        Assert.areEqual('FakeOrg/FakeRepo Pull Request #22 commented', notification.title);
        Assert.areEqual('fakeuser commented on pull request FakeOrg/FakeRepo#22\n \nTotal fake comment.', notification.message);
        Assert.areEqual('https://github.com/FakeOrg/FakeRepo/pull/22#discussion_r28513', notification.link);
    }

}));