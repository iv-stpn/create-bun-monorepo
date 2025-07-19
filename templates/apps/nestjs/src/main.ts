import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Enable CORS
	app.enableCors();

	const port = process.env.PORT || 3101;
	await app.listen(port);

	console.log(`🚀 NestJS is running on port ${port}`);
}

bootstrap();
