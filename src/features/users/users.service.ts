import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async create(user: Partial<User>): Promise<User> {
    const entity = this.usersRepo.create(user);
    return this.usersRepo.save(entity);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepo.update({ id: userId }, { isEmailVerified: true });
  }
}
