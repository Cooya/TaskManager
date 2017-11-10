import * as Logs from '@coya/services/logs';

export class Task {
	private name: string;
	private timeInterval: number;
	private nextExecutionTime: number;
	public run: Function;

	constructor(name: string, timeInterval: number, runFunction: Function) {
		this.name = name;
		this.timeInterval = timeInterval;
		this.nextExecutionTime = 0;
		if(runFunction) this.run = runFunction;
	}

	public getName() {
		return this.name;
	}

	public getTimeInterval() {
		return this.timeInterval;
	}

	public getNextExecutionTime() {
		return this.nextExecutionTime;
	}

	public setNextExecutionTime(time: number) {
		this.nextExecutionTime = time;
	}
}

export class TaskManager {
	private logs: Logs;
	private tasks: Array<Task>;

	public constructor() {
		this.logs = new Logs('scheduler');
	}

	public processSynchronousTasks(tasks?: Array<Task>) {
		if(tasks) this.tasks = tasks;
		if(this.tasks.length == 0)
			return Promise.resolve();

		const self = this;

		let timeDiff = self.tasks[0].getNextExecutionTime() - Date.now();
		if(timeDiff > 0) {
			self.logs.info('Waiting ' + timeDiff + ' milliseconds until the next execution...');
			return new Promise(function(resolve, reject) {
				setTimeout(function() {
					self.processSynchronousTasks.bind(self)
					.then(resolve)
					.catch(reject);
				}, timeDiff);
			});
		}

		let task = self.tasks.shift();
		return task.run()
		.then(function(stopTask) {
			if(stopTask)
				self.logs.error('Task "' + task.getName() + '" stopped and removed from the tasks list.');
			else {
				task.setNextExecutionTime(Date.now() + task.getTimeInterval() * 1000);
				self.reinsertIntoArray(task);
			}
			return self.processSynchronousTasks();
		})
		.catch(function(error) {
			if(error == 'task_not_working') {
				self.logs.error('Task "' + task.getName() + '" stopped and removed from the tasks list.');
				return self.processSynchronousTasks(); // task not reinserted into the tasks list
			}
			else
				return Promise.reject(error); // fatal error
		});
	}

	public processAsynchronousTasks(tasks: Array<Task>) {
		this.tasks = tasks;
		if(!this.tasks || this.tasks.length == 0)
			return Promise.resolve();

		return new Promise(function(resolve, reject) {
			for(let task of this.tasks)
				this.taskLoop(task, resolve, reject);
		}.bind(this));
	}

	public getLogs() {
		return this.logs;
	}

	private reinsertIntoArray(task: Task) {
		const nextExecutionTime = task.getNextExecutionTime();
		for(let i = 0; i < this.tasks.length; ++i) {
			if(this.tasks[i].getNextExecutionTime() > nextExecutionTime) {
				this.tasks.splice(i, 0, task);
				return;
			}
		}
		this.tasks.push(task);
	}

	private taskLoop(task: Task, resolve, reject) {
		const self = this;

		task.run()
		.then(function(stopTask) {
			if(stopTask)
				self.logs.error('Task "' + task.getName() + '" stopped and removed from the tasks list.');
			else {
				const nextExecutionTime = task.getTimeInterval() * 1000;
				task.setNextExecutionTime(nextExecutionTime); // useless actually
				setTimeout(self.taskLoop.bind(self, task, resolve, reject), nextExecutionTime);
				self.logs.info('Task "' + task.getName() + '" : ' + nextExecutionTime + ' milliseconds until the next execution...');
			}
		})
		.catch(function(error) {
			if(error == 'task_not_working') {
				self.tasks.splice(self.tasks.indexOf(task), 1);
				self.logs.error('Task "' + task.getName() + '" removed from the tasks list.');
				if(self.tasks.length == 0)
					resolve();
			}
			else
				reject(error); // fatal error
		});
	}
}