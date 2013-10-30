var nconf = require('nconf'),
    daemon = require('daemon'),
    notifier = require('./notifier'),
    SleepyQueue = require('./sleepy_queue'),
    GitHubListener = require('./github_listener'),
    github_notification = require('./github_notification');

function initialize() {
    nconf.file({
        file: 'settings.json'
    });
    nconf.defaults({
        token: '',
        orgs: {},
        github_host: 'github.com',
        github_api_host: 'api.github.com',
        github_api_path: '',
        ignore_repos: [],
        ignore_events: [],
        daemon: false,
        pid: process.pid
    });
}

module.exports = {
    start: function () {
        initialize();

        var queue = new SleepyQueue({delay: 3000}),
            listener = new GitHubListener({
                token: nconf.get('token'),
                orgs: nconf.get('orgs'),
                ignoreRepos: nconf.get('ignore_repos'),
                ignoreEvents: nconf.get('ignore_events'),
                githubHost: nconf.get('github_host'),
                githubApiHost: nconf.get('github_api_host'),
                githubApiPath: nconf.get('github_api_path')
            });

        listener.on('error', console.error);
        listener.on('event', queue.push);
        queue.on('pop', notifier.send);
        queue.on('pop', function (event) {
            nconf.set('orgs:' + event.org.login, event.id);
            nconf.save();
        });

        // Jump into daemon mode
        if (nconf.get('daemon')) {
            daemon();
            nconf.set('pid', process.pid);
            nconf.save();
        }
    },

    stop: function () {
        initialize();

        process.kill(nconf.get('pid'));
    },

    set: function (obj) {
        var keys = ['token', 'daemon', 'orgs', 'ignore_repos',
                    'ignore_events', 'github_host', 'github_api_host', 'github_api_path'];
        obj = (typeof obj === 'object' ? obj : {});
        initialize();

        // @todo Must be better
        Object.keys(obj).forEach(function (key) {
            var value;
            switch (key) {
            case 'token':
            case 'github_host':
            case 'github_api_host':
            case 'github_api_path':
                value = obj[key].toString();
                break;
            case 'daemon':
                value = (obj[key] === 'true');
                break;
            case 'orgs':
            case 'ignore_repos':
            case 'ignore_events':
                value = JSON.parse(obj[key]);
                break;
            }
            if (value !== undefined) {
                nconf.set(key, value);
                nconf.save();
            }
        });

        keys.forEach(function (key) {
            console.log(key + ':\t' + JSON.stringify(nconf.get(key)));
        });
    }
};
