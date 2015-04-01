# kue-concierge

A utility to keep your kue tidy

## Usage

```
var kue = require('kue');
this.queue = kue.createQueue(config);
var Concierge = require('kue-concierge');
var concierge = new Concierge(this.queue, options);
```

### Restart stuck jobs

```
concierge.restartStuck()
```

### Clear complete jobs

```
concierge.clearComplete()
```

### Clear failed jobs

```
concierge.clearFailed()
```

### Options

```
{
	maxFailedTime: 10 * 24 * 60 * 60 * 1000; // 10 days,
	maxActiveTime: 2 * 60 * 60 * 1000; // 2 hours
	maxCompleteTime: 2 * 24 * 60 * 60 * 1000; // 2 days
};
```

## Inspiration

https://github.com/Automattic/kue/issues/58

https://github.com/darielnoel/kue-cleanup
