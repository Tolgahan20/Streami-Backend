import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`Finding user by email: ${email}`);
    const user = await this.usersRepo.findOne({ where: { email } });
    this.logger.log(`User found: ${user ? 'yes' : 'no'}`);
    return user;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    this.logger.log(`Finding user by Google ID: ${googleId}`);
    const user = await this.usersRepo.findOne({ where: { googleId } });
    this.logger.log(`User found: ${user ? 'yes' : 'no'}`);
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    this.logger.log(`Finding user by username: ${username}`);
    const user = await this.usersRepo.findOne({ where: { username } });
    this.logger.log(`User found: ${user ? 'yes' : 'no'}`);
    return user;
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    this.logger.log(`Finding user by email or username: ${emailOrUsername}`);

    // Check if it's an email (contains @)
    const isEmail = emailOrUsername.includes('@');

    const user = await this.usersRepo.findOne({
      where: isEmail
        ? { email: emailOrUsername }
        : { username: emailOrUsername },
    });

    this.logger.log(`User found: ${user ? 'yes' : 'no'}`);
    return user;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    this.logger.log(`Checking username availability: ${username}`);
    const existingUser = await this.usersRepo.findOne({ where: { username } });
    const isAvailable = !existingUser;
    this.logger.log(
      `Username ${username} is ${isAvailable ? 'available' : 'taken'}`,
    );
    return isAvailable;
  }

  async create(user: Partial<User>): Promise<User> {
    this.logger.log(`Creating user with email: ${user.email}`);
    this.logger.log(`User data:`, user);

    try {
      const entity = this.usersRepo.create(user);
      this.logger.log(`Entity created:`, entity);

      const savedUser = await this.usersRepo.save(entity);
      this.logger.log(`User saved successfully with ID: ${savedUser.id}`);

      return savedUser;
    } catch (error) {
      this.logger.error(`Failed to create user:`, error);
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    this.logger.log(`Finding user by ID: ${id}`);
    const user = await this.usersRepo.findOne({ where: { id } });
    this.logger.log(`User found: ${user ? 'yes' : 'no'}`);
    return user;
  }

  async markEmailVerified(userId: string): Promise<void> {
    this.logger.log(`Marking email as verified for user: ${userId}`);
    await this.usersRepo.update({ id: userId }, { isEmailVerified: true });
    this.logger.log(`Email marked as verified for user: ${userId}`);
  }

  async updateLastLogin(userId: string): Promise<void> {
    this.logger.log(`Updating last login for user: ${userId}`);
    await this.usersRepo.update({ id: userId }, { lastLoginAt: new Date() });
    this.logger.log(`Last login updated for user: ${userId}`);
  }

  async updateUsername(userId: string, username: string): Promise<void> {
    this.logger.log(`Updating username for user: ${userId} to: ${username}`);
    await this.usersRepo.update({ id: userId }, { username });
    this.logger.log(`Username updated for user: ${userId}`);
  }
}
