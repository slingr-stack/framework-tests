import { Service } from '@drumr/framework-backend';

const MAX_ENTRIES = 100;

/**
 * Singleton-scoped service that keeps a shared in-memory log of task activity
 * across the entire application lifetime. Because it is singleton, all users
 * and all requests share the same instance — the log accumulates entries from
 * every action execution until the server restarts.
 *
 * DI scope: singleton (default)
 */
@Service()
export class ActivityLogService {
	private entries: string[] = [];

	addEntry(message: string): void {
		const timestamp = new Date().toISOString();
		this.entries.push(`[${timestamp}] ${message}`);
		// Keep only the most recent entries to avoid unbounded memory growth
		if (this.entries.length > MAX_ENTRIES) {
			this.entries.splice(0, this.entries.length - MAX_ENTRIES);
		}
	}

	getEntries(): string[] {
		return [...this.entries];
	}

	getCount(): number {
		return this.entries.length;
	}
}
