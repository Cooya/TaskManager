export abstract class Task {
	private name: string;
	private timeInterval: number;
	private nextExecutionTime: number;

	constructor(name: string, timeInterval = 60) {
		this.name = name;
		this.timeInterval = timeInterval;
		this.nextExecutionTime = 0;
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

	abstract run(): Promise<any>;
}