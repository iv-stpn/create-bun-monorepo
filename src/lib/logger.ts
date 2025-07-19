/**
 * Logging and progress utilities
 */

import chalk from "chalk";

type LogLevel = "debug" | "info" | "warn" | "error" | "success";

interface Logger {
	debug(message: string): void;
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
	success(message: string): void;
	progress(message: string): void;
}

/**
 * Console logger with colors
 */
class ConsoleLogger implements Logger {
	constructor(private readonly level: LogLevel = "info") {}

	debug(message: string): void {
		if (this.shouldLog("debug")) {
			console.log(chalk.gray(`[DEBUG] ${message}`));
		}
	}

	info(message: string): void {
		if (this.shouldLog("info")) {
			console.log(chalk.blue(`[INFO] ${message}`));
		}
	}

	warn(message: string): void {
		if (this.shouldLog("warn")) {
			console.log(chalk.yellow(`[WARN] ${message}`));
		}
	}

	error(message: string): void {
		if (this.shouldLog("error")) {
			console.log(chalk.red(`[ERROR] ${message}`));
		}
	}

	success(message: string): void {
		if (this.shouldLog("success")) {
			console.log(chalk.green(`[SUCCESS] ${message}`));
		}
	}

	progress(message: string): void {
		if (this.shouldLog("info")) {
			console.log(chalk.cyan(`⏳ ${message}`));
		}
	}

	private shouldLog(level: LogLevel): boolean {
		const levels: Record<LogLevel, number> = {
			debug: 0,
			info: 1,
			warn: 2,
			error: 3,
			success: 1,
		};

		return levels[level] >= levels[this.level];
	}
}

// Default logger instance
export const logger = new ConsoleLogger((process.env.LOG_LEVEL as LogLevel) || "info");
