# Task Manager

Scheduler for run tasks successively or simultaneously. 

## Installation
```
npm install @coya/task-manager
```

## Build (for dev)
```
git clone https://github.com/Cooya/TaskManager
cd TaskManager
npm install // it will also install the development dependencies
npm run build
npm run example // run the example script in "examples" folder
```

## Usage examples
```javascript
const { TaskManager, Task } = require('@coya/task-manager');

const firstTask = new Task('firstTask', 10, function() {
    console.log('hello');
    return Promise.resolve();
});

const secondTask = new Task('secondTask', 5, function() {
    console.log('hola');
    return Promise.resolve();
});

const thirdTask = new Task('thirdTask', 2, function() {
    console.log('failure');
    return Promise.reject();
});

const taskManager = new TaskManager();
taskManager.end(function() {
    console.log('All tasks have been stopped, task manager shutted down.');
});
taskManager.processAsynchronousTasks([firstTask, secondTask, thirdTask]);
```

## Methods


### processSynchronousTasks(taskList)

Process tasks list successively, it means that tasks are executed one by one. The following task is executed once the previous one is done.

Parameter | Type    | Description | Default value
--------  | ---     | --- | ---
taskList  | array<Task> | list of objects implementing or inheriting the Task class | none

### processAsynchronousTasks(taskList)

Process tasks list simultaneously, it means that tasks are executed in the same time (using setTimeout()). It is different from setInterval() because the timer is launched after the task has been processed.

Parameter | Type    | Description | Default value
--------  | ---     | --- | ---
taskList  | array<Task> | list of objects implementing or inheriting the Task class | none

### Task spec

The Task class, and so its constructor, contains three fields :
* name => name of the task
* timeInterval => interval in seconds between each task execution
* maxFailuresInARow (optional) => determine the number of failures in a row before the task will be taken out of the task list (default it is 5) 
* run => task function called by the scheduler, it must return a promise (this function can be passed to the Task constructor or be a member method of the inheriting class)
