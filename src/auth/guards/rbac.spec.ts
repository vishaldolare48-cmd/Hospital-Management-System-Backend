import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UsersController } from '../../users/users.controller';
import { UsersService } from '../../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any, requiredRoles?: string[]): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
    
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should return true if no roles are required', () => {
    const context = createMockContext({ role: 'patient' }, undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if user has required role', () => {
    const context = createMockContext({ role: 'admin' }, ['admin', 'receptionist']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user does not have required role', () => {
    const context = createMockContext({ role: 'patient' }, ['admin', 'receptionist']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user is not authenticated', () => {
    const context = createMockContext(undefined, ['admin']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

describe('UsersController (RBAC Privacy Boundary)', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockUsersService = {
      findById: jest.fn(),
      hasAppointmentWith: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService) as any;
  });

  describe('getOne', () => {
    it('should allow patient to access their own details', async () => {
      const mockPatient = { _id: 'patient-123', role: 'patient', name: 'John Doe' };
      usersService.findById.mockResolvedValue(mockPatient as any);

      const result = await controller.getOne('patient-123', {
        user: { sub: 'patient-123', role: 'patient' },
      });

      expect(result).toEqual(mockPatient);
    });

    it('should deny patient to access other user details', async () => {
      const mockPatient = { _id: 'patient-456', role: 'patient', name: 'Other Patient' };
      usersService.findById.mockResolvedValue(mockPatient as any);

      await expect(
        controller.getOne('patient-456', {
          user: { sub: 'patient-123', role: 'patient' },
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow doctor to access patient details only if appointment exists', async () => {
      const mockPatient = { _id: 'patient-123', role: 'patient', name: 'Patient' };
      usersService.findById.mockResolvedValue(mockPatient as any);
      usersService.hasAppointmentWith.mockResolvedValue(true);

      const result = await controller.getOne('patient-123', {
        user: { sub: 'doctor-123', role: 'doctor' },
      });

      expect(result).toEqual(mockPatient);
      expect(usersService.hasAppointmentWith).toHaveBeenCalledWith('doctor-123', 'patient-123');
    });

    it('should deny doctor access to patient details if no appointment exists', async () => {
      const mockPatient = { _id: 'patient-123', role: 'patient', name: 'Patient' };
      usersService.findById.mockResolvedValue(mockPatient as any);
      usersService.hasAppointmentWith.mockResolvedValue(false);

      await expect(
        controller.getOne('patient-123', {
          user: { sub: 'doctor-123', role: 'doctor' },
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow doctor to access their own or another doctor/staff details without appointment check', async () => {
      const mockDoctor = { _id: 'doctor-456', role: 'doctor', name: 'Another Doctor' };
      usersService.findById.mockResolvedValue(mockDoctor as any);

      const result = await controller.getOne('doctor-456', {
        user: { sub: 'doctor-123', role: 'doctor' },
      });

      expect(result).toEqual(mockDoctor);
      expect(usersService.hasAppointmentWith).not.toHaveBeenCalled();
    });
  });
});
