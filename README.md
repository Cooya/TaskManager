# Task Manager

Scheduler for run tasks successively or simultaneously. 

## Installation
```
npm install @coya/task-manager
```

## Usage examples
```javascript
const { TaskManager, Task } = require('@coya/task-manager');

const firstTask = new Task('firstTask', 10, function() { // processed every 10 seconds
    console.log('hello');
    return Promise.resolve();
});

const secondTask = new Task('secondTask', 5, function() { // processed every 5 seconds
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
* runFunction => task function called by the scheduler, it must return a promise (this function can be passed to the Task constructor or be a member method of the inheriting class)
