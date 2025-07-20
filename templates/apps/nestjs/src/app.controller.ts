import { Controller, Get } from "@nestjs/common";
// biome-ignore lint/style/useImportType: AppService is used for dependency injection at runtime
import { AppService } from "./app.service";

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	getHello(): string {
		return this.appService.getHello();
	}

	@Get("health")
	getHealth() {
		return {
			status: "ok",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
		};
	}
}
