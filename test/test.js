/* globals describe, it, before*/
(function () {
	'use strict';
	var moment = require('moment');
	var chai = require('chai');
	// var chaiAsPromised = require('chai-as-promised');
	// chai.use(chaiAsPromised);
	var should = require('chai').should();
	var expect = chai.expect;
	var config = {
		prefix: 'dev',
		redis: {
			port: 6379,
			host: 'localhost'
		}
	};
	describe('kue_concierge', function () {
		var Concierge = require('../index.js');
		describe('exports', function () {
			var options = {
				maxFailedTime: 1,
				maxActiveTime: 2 * 60 * 60 * 1000,
				maxCompleteTime: 2
			};
			var concierge;
			before(function() {
				concierge = new Concierge(config, options);
			});
			it('should initialize a client', function () {
				expect(concierge).to.have.a.property('queue');
				expect(concierge.queue).to.have.a.property('client');
			});
			it('should have configured values', function () {
				expect(concierge).to.have.a.property('maxFailedTime', 1);
				expect(concierge).to.have.a.property('maxActiveTime', 2 * 60 * 60 * 1000);
				expect(concierge).to.have.a.property('maxCompleteTime', 2);
			});
			it('should filter by age', function () {
				var job_1 = {updated_at: moment().subtract(3,'hours').valueOf()};
				expect(concierge.isJobExpired(job_1,'active')).to.be.true;
				var job_2 = {updated_at: moment().subtract(1,'hours').valueOf()};
				expect(concierge.isJobExpired(job_2,'active')).to.be.false;
			});
			// it('should restart stuck jobs', function (done) {
			// 	concierge.restartStuck().then(function() {
			// 		return done();
			// 	});
			// });
			// it('should clear complete jobs', function (done) {
			// 	concierge.clearComplete().then(function() {
			// 		return done();
			// 	});
			// });
			// it('should clear failed jobs', function (done) {
			// 	concierge.clearFailed().then(function() {
			// 		return done();
			// 	});
			// });
			it('should count complete jobs', function (done) {
				concierge.countComplete().then(function(results) {
					console.log(results);
					return done();
				});
			});
			it('should restart stuck jobs', function (done) {
				this.timeout(60000);
				concierge.clearAllComplete().then(function() {
					return done();
				});
			});
		});
	});
}());
