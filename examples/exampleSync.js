const { TaskManager, Task } = require('../js/TaskManager.js');

const firstTask = new Task('firstTask', 10, function() {
	console.log('failure1');
	return Promise.reject();
});

const secondTask = new Task('secondTask', 5, function() {
	console.log('failure2');
	return Promise.reject();
});

const thirdTask = new Task('thirdTask', 2, function() {
	console.log('failure3');
	return Promise.reject();
});

const taskManager = new TaskManager();
taskManager.end(function() {
	console.log('All tasks have been stopped, task manager shutted down.');
});
taskManager.processSynchronousTasks([firstTask, secondTask, thirdTask]);