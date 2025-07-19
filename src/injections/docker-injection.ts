import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { OrmConfig } from "../types";

/**
 * Add Docker Compose development configuration based on database choice
 */
export async function addDockerCompose(rootPath: string, orm: OrmConfig): Promise<void> {
	if (orm.type === "none") return;

	const dockerComposeContent = generateDockerComposeContent(orm);
	const dockerComposePath = join(rootPath, "docker-compose.dev.yml");

	await writeFile(dockerComposePath, dockerComposeContent, "utf-8");
}

/**
 * Generate Docker Compose content based on ORM configuration
 */
function generateDockerComposeContent(orm: OrmConfig): string {
	const { database } = orm;

	switch (database) {
		case "postgresql":
			return generatePostgreSQLCompose();
		case "mysql":
			return generateMySQLCompose();
		case "sqlite":
			return generateSQLiteCompose();
		default:
			return "";
	}
}

/**
 * Generate Docker Compose for PostgreSQL
 */
function generatePostgreSQLCompose(): string {
	return `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: dev-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # PostgreSQL Admin Interface (optional)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: dev-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@localhost.com
      PGADMIN_DEFAULT_PASSWORD: admin
      PGADMIN_CONFIG_SERVER_MODE: 'False'
    ports:
      - "5050:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  pgadmin_data:

networks:
  default:
    name: dev-network
`;
}

/**
 * Generate Docker Compose for MySQL
 */
function generateMySQLCompose(): string {
	return `version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: dev-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: myapp_dev
      MYSQL_USER: mysql
      MYSQL_PASSWORD: mysql
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init:/docker-entrypoint-initdb.d
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-proot"]
      interval: 10s
      timeout: 5s
      retries: 5

  # MySQL Admin Interface (optional)
  phpmyadmin:
    image: phpmyadmin/phpmyadmin:latest
    container_name: dev-phpmyadmin
    restart: unless-stopped
    environment:
      PMA_HOST: mysql
      PMA_PORT: 3306
      PMA_USER: root
      PMA_PASSWORD: root
    ports:
      - "8080:80"
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  mysql_data:

networks:
  default:
    name: dev-network
`;
}

/**
 * Generate Docker Compose for SQLite (with optional database browser)
 */
function generateSQLiteCompose(): string {
	return `version: '3.8'

services:
  # SQLite Browser - Web-based SQLite database browser
  sqlite-browser:
    image: coleifer/sqlite-web:latest
    container_name: dev-sqlite-browser
    restart: unless-stopped
    ports:
      - "8081:8080"
    volumes:
      - ./:/data
    command: sqlite_web -H 0.0.0.0 -x /data/local.db
    profiles:
      - browser

  # Development tools container (optional)
  dev-tools:
    image: alpine:latest
    container_name: dev-tools
    restart: "no"
    volumes:
      - ./:/workspace
    working_dir: /workspace
    command: tail -f /dev/null
    profiles:
      - tools

networks:
  default:
    name: dev-network

# Usage:
# - Default: No services will start (SQLite is file-based)
# - With browser: docker-compose -f docker-compose.dev.yml --profile browser up
# - With tools: docker-compose -f docker-compose.dev.yml --profile tools up
`;
}
