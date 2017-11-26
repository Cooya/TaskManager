import * as Logs from '@coya/logs';

export class Task {
	private _name: string;
	private _timeInterval: number;
	private _maxFailuresInARow: number;
	private _nextExecutionTime: number;
	private _timeout: number; // only for asynchronous process
	private _totalExecutions: number;
	private _failedExecutions: number;
	private _failedExecutionsInARow: number;
	public run: Function;

	constructor(name: string, timeInterval: number, maxFailuresInARow?: number, runFunction?: Function) {
		if(typeof maxFailuresInARow === 'function') {
			runFunction = maxFailuresInARow;
			maxFailuresInARow = null;
		}

		this._name = name;
		this._timeInterval = timeInterval;
		this._maxFailuresInARow = maxFailuresInARow || 5;
		this._nextExecutionTime = 0;
		this._timeout = 0;
		this._totalExecutions = 0;
		this._failedExecutions = 0;
		this._failedExecutionsInARow = 0;
		if(runFunction) this.run = runFunction;
	}

	get name() {
		return this._name;
	}

	get timeInterval() {
		return this._timeInterval;
	}

	get maxFailuresInARow() {
		return this._maxFailuresInARow;
	}

	get nextExecutionTime() {
		return this._nextExecutionTime;
	}

	set nextExecutionTime(time: number) {
		this._nextExecutionTime = time;
	}

	set timeout(timeout) {
		this._timeout = timeout;
	}

	get failedExecutionsInARow() {
		return this._failedExecutionsInARow;
	}

	public incExecutionCounter(failed?: boolean) {
		this._totalExecutions++;
		if(failed) {
			this._failedExecutions++;
			this._failedExecutionsInARow++;
		}
		else
			this._failedExecutionsInARow = 0;
	}

	public cancel() {
		clearTimeout(this._timeout);
		this._timeout = null;
		this._nextExecutionTime = 0;
	}
}

export class TaskManager {
	private _logs: Logs;
	private _end: Function;
	private tasks: Array<Task>;

	public constructor() {
		this._logs = new Logs('task_manager');
	}

	public get logs() {
		return this._logs;
	}

	public end(end: Function) {
		this._end = end;
	}

	/*** SYNCHRONOUS SECTION ***/

	public processSynchronousTasks(tasks?: Array<Task>) {
		if(tasks) this.tasks = tasks;
		if(!this.tasks.length)
			return this._end();

		let timeDiff = this.tasks[0].nextExecutionTime - Date.now();
		if(timeDiff > 0) {
			this.logs.info('Waiting ' + timeDiff + ' milliseconds until the next execution...');
			setTimeout(this.processSynchronousTasks.bind(this), timeDiff);
			return;
		}

		let task = this.tasks.shift(); // take out the task from the array
		return task.run()
		.then((result) => {
			task.incExecutionCounter();
			if(result && result.stop)
				this.logs.info('Task "' + task.name + '" stopped and removed from the tasks list.');
			else if(result && result.stopAll) {
				this.tasks = [];
				this.logs.info('All tasks have been stopped and removed from the tasks list.');
			}
			else
				this.reinsertTaskIntoArray(task);
			this.processSynchronousTasks();
		})
		.catch((error) => {
			task.incExecutionCounter(true);
			if((error && error.stop) || task.failedExecutionsInARow >= task.maxFailuresInARow)
				this.logs.error('Task "' + task.name + '" stopped and removed from the tasks list.');
			else if(error && error.stopAll) {
				this.tasks = [];
				this.logs.error('All tasks have been stopped and removed from the tasks list.');
			}
			else
				this.reinsertTaskIntoArray(task);
			this.processSynchronousTasks();
		});
	}

	private reinsertTaskIntoArray(task: Task) {
		const nextExecutionTime = Date.now() + task.timeInterval * 1000;
		task.nextExecutionTime = nextExecutionTime;
		for(let i = 0; i < this.tasks.length; ++i) {
			if(this.tasks[i].nextExecutionTime > nextExecutionTime) {
				this.tasks.splice(i, 0, task);
				return;
			}
		}
		this.tasks.push(task); // reinsertion at the end
	}

	/*** ASYNCHRONOUS SECTION ***/

	public processAsynchronousTasks(tasks: Array<Task>) {
		this.tasks = tasks;
		if(!this.tasks || this.tasks.length == 0)
			return Promise.resolve();

		return new Promise(function(resolve, reject) {
			for(let task of this.tasks)
				this.taskLoop(task, this._end);
		}.bind(this));
	}

	private taskLoop(task: Task, end) {
		task.run()
		.then((result) => {
			task.incExecutionCounter();
			if(result && result.stop) {
				this.tasks.splice(this.tasks.indexOf(task), 1);
				this.logs.info('Task "' + task.name + '" stopped and removed from the tasks list.');
				if(this.tasks.length == 0)
					end();
			}
			else if(result && result.stopAll) {
				this.tasks.forEach((task) => {
					task.cancel();
				});
				this.tasks = [];
				this.logs.info('All tasks have been stopped and removed from the tasks list.');
				end();
			}
			else {
				const nextExecutionTime = task.timeInterval * 1000;
				task.nextExecutionTime = nextExecutionTime; // useless actually
				task.timeout = setTimeout(this.taskLoop.bind(this, task, end), nextExecutionTime);
				this.logs.info('Task "' + task.name + '" : ' + nextExecutionTime + ' milliseconds until the next execution...');
			}
		})
		.catch((error) => {
			task.incExecutionCounter(true);
			if((error && error.stop) || task.failedExecutionsInARow >= task.maxFailuresInARow) {
				this.tasks.splice(this.tasks.indexOf(task), 1);
				this.logs.error('Task "' + task.name + '" removed from the tasks list.');
				if(this.tasks.length == 0)
					end();
			}
			else if(error && error.stopAll) {
				this.tasks.forEach((task) => {
					task.cancel();
				});
				this.tasks = [];
				this.logs.error('All tasks have been stopped and removed from the tasks list.');
				end();
			}
			else {
				const nextExecutionTime = task.timeInterval * 1000;
				task.nextExecutionTime = nextExecutionTime; // useless actually
				task.timeout = setTimeout(this.taskLoop.bind(this, task, end), nextExecutionTime);
				this.logs.info('Task "' + task.name + '" : ' + nextExecutionTime + ' milliseconds until the next execution...');
			}
		});
	}
}