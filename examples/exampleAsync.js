const { TaskManager, Task } = require('../js/TaskManager.js');

const firstTask = new Task('firstTask', 10);
firstTask.run = function() {
	console.log('hello');
	return Promise.resolve();
};

const secondTask = new Task('secondTask', 5);
secondTask.run = function() {
	console.log('hola');
	return Promise.resolve();
};

const taskManager = new TaskManager();
taskManager.processAsynchronousTasks([firstTask, secondTask])
.then(function() {
	taskManager.getLogs().info('Scheduler stopped.');
	process.exit(0);
}, function(error) {
	taskManager.getLogs().error(error);
	process.exit(1);
});