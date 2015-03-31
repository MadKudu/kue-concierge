
var Q = require('q');

// default valued
var MAX_FAILED_TIME = 10 * 24 * 60 * 60 * 1000; // 10 days
var MAX_ACTIVE_TIME = 2 * 60 * 60 * 1000; // 2 hours
var MAX_COMPLETE_TIME = 2 * 24 * 60 * 60 * 1000; // 2 days

var KueConcierge = function(queue, options) {
	this.setOptions = function(options) {
		this.maxFailedTime = options.maxFailedTime || MAX_FAILED_TIME;
		this.maxActiveTime = options.maxActiveTime || MAX_ACTIVE_TIME;
		this.maxCompleteTime = options.maxCompleteTime || MAX_COMPLETE_TIME;
	};
	this.kue = require('kue');
	this.queue = queue;
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
		instance.clearComplete();
	}).then(function(){
		instance.clearFailed();
	});
};

KueConcierge.prototype.restartStuck = function() {
	var deferred = Q.defer();
	var instance = this;
	this.kue.Job.rangeByState('active', 0, 100, 'asc', function (err,jobs) {
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

KueConcierge.prototype.clearComplete = function() {
	var deferred = Q.defer();
	var instance = this;
	this.kue.Job.rangeByState('complete', 0, 100, 'asc', function (err,jobs) {
		if (err) {
			deferred.reject(err);
		}
		jobs.forEach(function (job) {
			if (instance.isJobExpired(job,'complete')) {
				job.remove();
			}
		});
		deferred.resolve();
	});
	return deferred.promise;
};

KueConcierge.prototype.clearFailed = function() {
	var deferred = Q.defer();
	var instance = this;
	this.kue.Job.rangeByState('failed', 0, 100, 'asc', function (err,jobs) {
		if (err) {
			deferred.reject(err);
		}
		jobs.forEach(function (job) {
			if (instance.isJobExpired(job,'failed')) {
				job.remove();
			}
		});
		deferred.resolve();
	});
	return deferred.promise;
};

module.exports = KueConcierge;






