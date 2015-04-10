
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
		console.log('There is already a queue initialized. Redis connection string and options are not used. See here for details: https://github.com/LearnBoost/kue/blob/master/lib/kue.js#L69');
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

KueConcierge.prototype.cleanUp = function() {
	var instance = this;
	instance.restartStuck().then(function(){
		instance.clearExpiredComplete();
	}).then(function(){
		instance.clearExpiredFailed();
	});
};

KueConcierge.prototype.restartStuck = function() {
	var deferred = Q.defer();
	var instance = this;
	this.kue.Job.rangeByState('active', 0, instance.batchSize, 'asc', function (err,jobs) {
		if (err) {
			deferred.reject(err);
		}
		jobs.forEach(function (job) {
			if (instance.isJobExpired(job,'active')) {
				job.log('Restarting job due to inactivity');
				console.log('Restarting job ' + job.id + ' due to inactivity');
				job.inactive();
			}
		});
		deferred.resolve();
	});
	return deferred.promise;
};

KueConcierge.prototype.clearExpiredComplete = function() {
	var instance = this;
	return Q.npost(this.kue.Job, 'rangeByState', ['complete', 0, instance.batchSize, 'asc'])
		.then(function (jobs) {
			jobs.forEach(function (job) {
				if (instance.isJobExpired(job, 'complete')) {
					console.log('Removing job ' + job.id + ' (complete)');
					job.remove();
				}
			});
		});
};

KueConcierge.prototype.clearExpiredFailed = function() {
	var instance = this;
	return Q.npost(this.kue.Job, 'rangeByState', ['failed', 0, instance.batchSize, 'asc'])
		.then(function (jobs) {
			jobs.forEach(function (job) {
				if (instance.isJobExpired(job, 'failed')) {
					console.log('Removing job ' + job.id + ' (failed)');
					job.remove();
				}
			});
		});
};

KueConcierge.prototype.countComplete = function() {
	return Q.npost(this.queue, 'completeCount');
};

KueConcierge.prototype.clearAllComplete = function() {
	var instance = this;
	return Q.npost(this.kue.Job, 'rangeByState', ['complete', 0, instance.batchSize, 'asc'])
		.then(function (jobs) {
			jobs.forEach(function (job) {
				console.log('Removing job ' + job.id + ' (complete)');
				job.remove();
			});
		})
		.then(function() {
			return instance.countComplete();
		})
		.then(function(count) {
			if (count > 0) {
				return instance.clearAllComplete();
			} else {
				return;
			}
		});
};

module.exports = KueConcierge;






