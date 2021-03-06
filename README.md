#  [![npm version](https://badge.fury.io/js/kue-concierge.svg)](http://badge.fury.io/js/kue-concierge) [![Build Status](https://travis-ci.org/MadKudu/kue-concierge.svg)](https://travis-ci.org/MadKudu/kue-concierge) [![Dependency Status](https://david-dm.org/MadKudu/kue-concierge.svg)](https://david-dm.org/MadKudu/kue-concierge)

# kue-concierge

A utility to keep your [kue](https://github.com/Automattic/kue) tidy

## Usage

```
var Concierge = require('kue-concierge');
var concierge = new Concierge(config, options);
```

### Restart stuck jobs

```
concierge.restartStuck()
```

### Clear complete jobs

```
concierge.clearExpiredByType('complete')
```

### Clear failed jobs

```
concierge.clearExpiredByType('failed')
```

### Clear all complete jobs

```
concierge.clearAllByType('complete')
```

### Clear all complete jobs (above a certain number)

```
concierge.clearAllByType('complete', threshold)
```


All functions above are promises

### Config

Same format as the kue.createQueue options:
```
{
	prefix: 'q',
	redis: {
		port: 1234,
		host: '10.0.50.20',
		auth: 'password',
		db: 3, // if provided select a non-default redis db
		options: {
			// see https://github.com/mranney/node_redis#rediscreateclient
		}
	}
}
```

### Options

```
{
	maxFailedTime: 10 * 24 * 60 * 60 * 1000; // 10 days,
	maxActiveTime: 2 * 60 * 60 * 1000; // 2 hours
	maxCompleteTime: 2 * 24 * 60 * 60 * 1000; // 2 days
};
```

## Test

```
npm test
```

## Inspiration

https://github.com/Automattic/kue/issues/58

https://github.com/darielnoel/kue-cleanup
