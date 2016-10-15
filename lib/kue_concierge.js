var debug = require('debug')('kue-concierge');
var Q = require('q');

// default valued
var MAX_FAILED_TIME = 10 * 24 * 60 * 60 * 1000; // 10 days
var MAX_ACTIVE_TIME = 2 * 60 * 60 * 1000; // 2 hours
var MAX_COMPLETE_TIME = 1 * 24 * 60 * 60 * 1000; // 1 day
var MAX_JOBS = 2000;
var BATCH_SIZE = 1000;

var KueConcierge = function(config, options) {
	this.setOptions = function(options) {
		this.maxFailedTime = options.maxFailedTime || MAX_FAILED_TIME;
		this.maxActiveTime = options.maxActiveTime || MAX_ACTIVE_TIME;
		this.maxCompleteTime = options.maxCompleteTime || MAX_COMPLETE_TIME;
		this.maxJobs = options.maxJobs || MAX_JOBS;
		this.batchSize = options.batchSize || BATCH_SIZE;
	};
	this.kue = require('kue');
	if (this.kue.singleton) {
		debug('There is already a queue initialized. Redis connection string and options are not used. See here for details: https://github.com/LearnBoost/kue/blob/master/lib/kue.js#L69');
		this.queue = this.kue.singleton;
	} else {
		this.queue = this.kue.createQueue(config);
	}
	this.options = options || {};
	this.setOptions(this.options);
};

KueConcierge.prototype.isJobExpired = function(job, state) {
	var now = new Date();
	var created = new Date(parseInt(job.updated_at));
	var age = parseInt(now - created);
	var maxTime;
	switch(state) {
		case 'failed':
			maxTime = this.maxFailedTime;
			break;
		case 'active':
			maxTime = this.maxActiveTime;
			break;
		case 'complete':
			maxTime = this.maxCompleteTime;
			break;
	}
	return age > maxTime;
};

KueConcierge.prototype.restartStuck = function() {
	var instance = this;
	return Q.npost(this.kue.Job, 'rangeByState', ['active', 0, instance.batchSize, 'asc'])
		.then(function (jobs) {
		jobs.forEach(function (job) {
			if (instance.isJobExpired(job,'active')) {
				job.log('Restarting job due to inactivity');
				debug('Restarting job ' + job.id + ' due to inactivity');
				job.inactive();
			}
		});
	});
};

KueConcierge.prototype.clearExpiredByType = function(status) {
	var instance = this;
	return Q.npost(this.kue.Job, 'rangeByState', [status, 0, instance.batchSize, 'asc'])
		.then(function (jobs) {
			jobs.forEach(function (job) {
				if (instance.isJobExpired(job, status)) {
					debug('Removing job ' + job.id + ' (' + status + ' expired)');
					job.remove();
				}
			});
		});
};

KueConcierge.prototype._getCountMethod = function(status) {
	switch (status) {
		case 'complete':
			return Q.npost(this.queue, 'completeCount');
		case 'failed':
			return Q.npost(this.queue, 'failedCount');
		case 'active':
			return Q.npost(this.queue, 'activeCount');
		case 'inactive':
			return Q.npost(this.queue, 'inactiveCount');
			
	}
};

KueConcierge.prototype.countJobs = function(status,threshold) {
	threshold = threshold || 0;
	var countJobs = this._getCountMethod(status);
	return countJobs.then(function(count) {
		if (count > threshold) {
			return count - threshold;
		} else {
			return 0;
		}
	});
};

KueConcierge.prototype.removeBatch = function(status, batchSize) {
	if (batchSize === 0) {
		return;
	}
	return Q.npost(this.kue.Job, 'rangeByState', [status, 0, batchSize, 'asc'])
		.then(function (jobs) {
			jobs.forEach(function (job) {
				debug('Removing job ' + job.id + ' (' + status + ')');
				job.remove();
			});
		});
};

KueConcierge.prototype.clearAllByType = function(status, threshold) {
	var instance = this;
	return instance.countJobs(status, threshold)
		.then(function(count) {
			var batchSize = Math.min(count, instance.batchSize);
			return instance.removeBatch(status, batchSize);
		})
		.then(function() {
			return instance.countJobs(status, threshold);
		})
		.then(function(count) {
			if (count > 0) {
				return instance.clearAllByType(status, threshold);
			} else {
				return;
			}
		});
};

module.exports = KueConcierge;






