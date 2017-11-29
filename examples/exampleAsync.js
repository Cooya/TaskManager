const { TaskManager, Task } = require('../js/TaskManager.js');

const firstTask = new Task('firstTask', 10, function() {
	console.log('hello');
	return Promise.resolve();
});

const secondTask = new Task('secondTask', 5, function() {
	console.log('hola');
	this.timeInterval = this.timeInterval + 1;
	return Promise.resolve();
});

const thirdTask = new Task('thirdTask', 2, function() {
	console.log('failure');
	return Promise.reject();
});

const taskManager = new TaskManager();
taskManager.end(() => {
	console.log('All tasks have been stopped, task manager shutted down.');
});
taskManager.processAsynchronousTasks([firstTask, secondTask, thirdTask]);