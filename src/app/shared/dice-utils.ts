export class DiceUtils {
    constructor() {
    }
    static rolld6(): number {
        return Math.floor(Math.random() * 6) + 1;
    }
    static standardRoll(modifier: number = 0): number {
        return this.rolld6() + this.rolld6() + modifier;
    }
    static rollStandardCheck(targetNumber: number, modifier: number = 0): boolean {
        return this.standardRoll(modifier) >= targetNumber;
    }
    static rollSingleDiceCheck(targetNumber: number, modifier: number = 0): boolean {
        return this.rolld6() + modifier >= targetNumber;
    }
}