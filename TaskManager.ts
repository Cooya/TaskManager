import * as Logs from '@coya/logs';

export class Task {
	readonly _name: string;
	readonly _timeInterval: number;
	readonly _maxFailuresInARow: number;
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
	readonly _logs: Logs;
	private _end: Function;
	private _isEnded: boolean;
	private _tasks: Array<Task>;

	public constructor(config) {
		this._logs = new Logs('task_manager', config);
		this._isEnded = false;
	}

	public get logs() {
		return this._logs;
	}

	public end(end: Function) {
		this._end = end;
	}

	/*** SYNCHRONOUS SECTION ***/

	public processSynchronousTasks(tasks?: Array<Task>) {
		if(tasks) this._tasks = tasks;
		if(!this._tasks.length)
			return this._end();

		let timeDiff = this._tasks[0].nextExecutionTime - Date.now();
		if(timeDiff > 0) {
			this._logs.info('Waiting ' + timeDiff + ' milliseconds until the next execution...');
			setTimeout(this.processSynchronousTasks.bind(this), timeDiff);
			return;
		}

		let task = this._tasks.shift(); // take out the task from the array
		return task.run()
		.then((result) => {
			task.incExecutionCounter();
			if(result && result.stop)
				this._logs.info('Task "' + task.name + '" stopped and removed from the tasks list.');
			else if(result && result.stopAll) {
				this._tasks = [];
				this._logs.info('All tasks have been stopped and removed from the tasks list.');
			}
			else
				this.reinsertTaskIntoArray(task);
			this.processSynchronousTasks();
		})
		.catch((error) => {
			task.incExecutionCounter(true);
			if((error && error.stop) || task.failedExecutionsInARow >= task.maxFailuresInARow)
				this._logs.error('Task "' + task.name + '" stopped and removed from the tasks list.');
			else if(error && error.stopAll) {
				this._tasks = [];
				this._logs.error('All tasks have been stopped and removed from the tasks list.');
			}
			else
				this.reinsertTaskIntoArray(task);
			this.processSynchronousTasks();
		});
	}

	private reinsertTaskIntoArray(task: Task) {
		const nextExecutionTime = Date.now() + task.timeInterval * 1000;
		task.nextExecutionTime = nextExecutionTime;
		for(let i = 0; i < this._tasks.length; ++i) {
			if(this._tasks[i].nextExecutionTime > nextExecutionTime) {
				this._tasks.splice(i, 0, task);
				return;
			}
		}
		this._tasks.push(task); // reinsertion at the end
	}

	/*** ASYNCHRONOUS SECTION ***/

	public processAsynchronousTasks(tasks: Array<Task>) {
		this._tasks = tasks;
		if(!this._tasks || this._tasks.length == 0)
			return this.endTaskManager('No tasks to process.');

		for(let task of this._tasks)
			this.taskLoop(task);
	}

	private taskLoop(task: Task) {
		task.run()
		.then((result) => {
			task.incExecutionCounter();
			if(result && result.stop) {
				this._tasks.splice(this._tasks.indexOf(task), 1);
				this._logs.info('Task "' + task.name + '" stopped and removed from the tasks list.');
				if(!this._tasks.length)
					this.endTaskManager();
			}
			else if(result && result.stopAll)
				this.endTaskManager();
			else
				this.scheduleTask(task);
		})
		.catch((error) => {
			task.incExecutionCounter(true);
			if((error && error.stop) || task.failedExecutionsInARow >= task.maxFailuresInARow) {
				this._tasks.splice(this._tasks.indexOf(task), 1);
				this._logs.error('Task "' + task.name + '" stopped and removed from the tasks list.');
				if(!this._tasks.length)
					this.endTaskManager('The last task has been stopped and removed from the tasks list.');
			}
			else if(error && error.stopAll)
				this.endTaskManager('All tasks have been stopped and removed from the tasks list.');
			else
				this.scheduleTask(task);
		});
	}

	private scheduleTask(task: Task) {
		const nextExecutionTime = task.timeInterval * 1000;
		task.nextExecutionTime = nextExecutionTime; // useless actually
		task.timeout = setTimeout(this.taskLoop.bind(this, task), nextExecutionTime);
		this._logs.info('Task "' + task.name + '" : ' + nextExecutionTime + ' milliseconds until the next execution...');
	}

	private endTaskManager(error?: string) {
		if(!this._isEnded) { // this boolean allows to not call multiple times the end function if several tasks are running at the same time
			if(error)
				this._logs.error(error);
			this._isEnded = true;
			this._logs.info('Ending task manager...');
			if(this._tasks.length) {
				this._tasks.forEach((task) => {
					task.cancel();
				});
				this._tasks = [];
			}
			if(this._end) this._end();
		}
	}
}