import {IDisposable} from '../extensibility/idisposable';

/*
 * Represents a time measurement within an API operation
 */
export class PerformanceBreakdown implements IDisposable {

    private _name: string;
    private _startTime: [number, number];
    private _millisecondsTaken: number;
    private _children: PerformanceBreakdown[];

    /*
     * Start a performance measurement when created
     */
    public constructor(name: string) {
        this._name = name;
        this._children = [];
        this._startTime = process.hrtime();
        this._millisecondsTaken = 0;
    }

    /*
     * Stop the timer and finish the measurement
     */
    public dispose(): void {
        const endTime = process.hrtime(this._startTime);
        this._millisecondsTaken = (endTime[0] * 1000000000 + endTime[1]) / 1000000;
    }

    /*
     * Return the time taken
     */
    public get millisecondsTaken(): number {
        return this._millisecondsTaken;
    }

    /*
     * Return data as an object
     */
    public get data(): any {

        const data: any = {
            name: this._name,
            millisecondsTaken: this._millisecondsTaken,
        };

        if (this._children.length > 0) {
            data.children = [];
            this._children.forEach((child) => data.children.push(child.data));
        }

        return data;
    }

    /*
     * Add a child to the performance breakdown
     */
    public createChild(name: string): PerformanceBreakdown {
        const child = new PerformanceBreakdown(name);
        this._children.push(child);
        return child;
    }
}
