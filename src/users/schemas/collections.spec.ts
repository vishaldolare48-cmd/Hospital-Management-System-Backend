import { AdminSchema } from './admin.schema';
import { ReceptionistSchema } from './receptionist.schema';
import { DoctorSchema } from './doctor.schema';
import { PatientSchema } from './patient.schema';

describe('Separate User Role Collections Configuration', () => {
  it('should have correct collection name for AdminSchema', () => {
    expect(AdminSchema.get('collection')).toBe('admins');
  });

  it('should have correct collection name for ReceptionistSchema', () => {
    expect(ReceptionistSchema.get('collection')).toBe('receptionists');
  });

  it('should have correct collection name for DoctorSchema', () => {
    expect(DoctorSchema.get('collection')).toBe('doctors');
    expect(DoctorSchema.path('specialization')).toBeDefined();
    expect(DoctorSchema.path('consultationFee')).toBeDefined();
    expect(DoctorSchema.path('workingHours')).toBeDefined();
  });

  it('should have correct collection name for PatientSchema', () => {
    expect(PatientSchema.get('collection')).toBe('patients');
    expect(PatientSchema.path('dob')).toBeDefined();
    expect(PatientSchema.path('emergencyContact')).toBeDefined();
    expect(PatientSchema.path('medicalHistory')).toBeDefined();
  });
});
