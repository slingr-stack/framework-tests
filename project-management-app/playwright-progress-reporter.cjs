class PlaywrightProgressReporter {
	onBegin(_config, suite) {
		this.totalTests = suite.allTests().length;
		this.currentTest = 0;

		if (this.totalTests > 0) {
			console.log(
				`Starting Playwright run: 0 of ${this.totalTests} tests completed`,
			);
		}
	}

	onTestBegin(test, result) {
		if (result.retry > 0) {
			console.log(
				`Running RETRY of test: ${test.titlePath().slice(1).join(" > ")}`,
			);
		} else {
			this.currentTest += 1;
			console.log(
				`Running test ${this.currentTest} of ${this.totalTests}: ${test.titlePath().slice(1).join(" > ")}`,
			);
		}
	}
}

module.exports = PlaywrightProgressReporter;
