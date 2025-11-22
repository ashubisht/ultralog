import { Module, Injectable, Controller, Get, Post, Body } from '@nestjs/common';
import { UltralogModule, UltralogService } from '../src/lib/frameworks/NestJSLogger';
import { LoggerConfig } from '../src/lib/types';

// Example service using the logger
@Injectable()
export class UserService {
  constructor(private readonly logger: UltralogService) {}

  async createUser(userData: any) {
    this.logger.info('Creating user', 'UserService', { userId: userData.id });
    
    try {
      // Simulate user creation
      const user = { id: userData.id, name: userData.name, email: userData.email };
      
      this.logger.info('User created successfully', 'UserService', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack, 'UserService', { 
        userId: userData.id,
        error: error.message 
      });
      throw error;
    }
  }

  async getUserById(id: string) {
    this.logger.debug('Fetching user by ID', 'UserService', { userId: id });
    
    // Simulate database query
    const user = { id, name: 'John Doe', email: 'john@example.com' };
    
    this.logger.info('User fetched successfully', 'UserService', { userId: id });
    return user;
  }
}

// Example controller
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: UltralogService
  ) {}

  @Post()
  async createUser(@Body() userData: any) {
    this.logger.info('POST /users - Creating user', 'UserController', { 
      body: userData 
    });
    
    return await this.userService.createUser(userData);
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    this.logger.info('GET /users/:id - Fetching user', 'UserController', { 
      userId: id 
    });
    
    return await this.userService.getUserById(id);
  }
}

// Application module
@Module({
  imports: [
    UltralogModule.forRoot({
      transport: 'console',
      level: 'info',
      format: 'json',
      context: {
        service: 'user-service',
        version: '1.0.0',
        environment: 'development'
      },
      metrics: {
        enabled: true
      },
      tracing: true
    })
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class AppModule {}

// Alternative: Async configuration
@Module({
  imports: [
    UltralogModule.forRootAsync({
      useFactory: async (): Promise<LoggerConfig> => {
        // You can load configuration from environment variables, config files, etc.
        return {
          transport: process.env.LOG_TRANSPORT as any || 'console',
          level: process.env.LOG_LEVEL as any || 'info',
          format: process.env.LOG_FORMAT as any || 'json',
          context: {
            service: process.env.SERVICE_NAME || 'user-service',
            version: process.env.SERVICE_VERSION || '1.0.0',
            environment: process.env.NODE_ENV as any || 'development'
          },
          transportConfig: {
            file: {
              filename: process.env.LOG_FILE || 'app.log',
              level: 'info'
            }
          },
          metrics: {
            enabled: process.env.METRICS_ENABLED === 'true'
          },
          tracing: process.env.TRACING_ENABLED === 'true'
        };
      }
    })
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class AsyncAppModule {}
