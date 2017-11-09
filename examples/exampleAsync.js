const { TaskManager, Task } = require('../js/TaskManager.js');

const firstTask = new Task('firstTask', 10, function() {
	console.log('hello');
	return Promise.resolve();
});

const secondTask = new Task('secondTask', 5, function() {
	console.log('hola');
	return Promise.resolve();
});

const taskManager = new TaskManager();
taskManager.processAsynchronousTasks([firstTask, secondTask])
.then(function() {
	taskManager.getLogs().info('Task manager stopped.');
}, function(error) {
	taskManager.getLogs().error(error);
	process.exit(1); // cancel all other scheduled tasks
});