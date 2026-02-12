import {
  validateTaskInput,
  validatePriority,
  validateStatus,
  validateDateFormat,
  validateDescription,
  validateAssignee,
  validateLimit,
  VALID_PRIORITIES,
  VALID_STATUSES
} from '../../src/lib/validation';

describe('Validation Module', () => {
  describe('validateDescription', () => {
    test('should reject undefined description', () => {
      const error = validateDescription(undefined);
      expect(error).toBe('Description is required');
    });

    test('should reject null description', () => {
      const error = validateDescription(null);
      expect(error).toBe('Description is required');
    });

    test('should reject non-string description', () => {
      const error = validateDescription(123);
      expect(error).toBe('Description must be a string');
    });

    test('should reject empty string description', () => {
      const error = validateDescription('');
      expect(error).toBe('Description cannot be empty or whitespace only');
    });

    test('should reject whitespace-only description', () => {
      const error = validateDescription('   ');
      expect(error).toBe('Description cannot be empty or whitespace only');
    });

    test('should reject description exceeding max length', () => {
      const longDescription = 'a'.repeat(1001);
      const error = validateDescription(longDescription);
      expect(error).toBe('Description must not exceed 1000 characters');
    });

    test('should accept valid description', () => {
      const error = validateDescription('Valid task description');
      expect(error).toBeNull();
    });

    test('should accept description at max length', () => {
      const maxDescription = 'a'.repeat(1000);
      const error = validateDescription(maxDescription);
      expect(error).toBeNull();
    });
  });

  describe('validatePriority', () => {
    test('should accept all valid priorities', () => {
      VALID_PRIORITIES.forEach(priority => {
        const error = validatePriority(priority);
        expect(error).toBeNull();
      });
    });

    test('should reject invalid priority', () => {
      const error = validatePriority('P5');
      expect(error).toContain('Priority must be one of');
    });

    test('should reject lowercase priority', () => {
      const error = validatePriority('p0');
      expect(error).toContain('Priority must be one of');
    });

    test('should reject numeric priority', () => {
      const error = validatePriority(0);
      expect(error).toContain('Priority must be one of');
    });
  });

  describe('validateStatus', () => {
    test('should accept all valid statuses', () => {
      VALID_STATUSES.forEach(status => {
        const error = validateStatus(status);
        expect(error).toBeNull();
      });
    });

    test('should reject invalid status', () => {
      const error = validateStatus('completed');
      expect(error).toContain('Status must be one of');
    });

    test('should reject uppercase status', () => {
      const error = validateStatus('OPEN');
      expect(error).toContain('Status must be one of');
    });

    test('should reject numeric status', () => {
      const error = validateStatus(1);
      expect(error).toContain('Status must be one of');
    });
  });

  describe('validateDateFormat', () => {
    test('should accept valid ISO 8601 date (YYYY-MM-DD)', () => {
      const error = validateDateFormat('2024-12-31');
      expect(error).toBeNull();
    });

    test('should accept valid ISO 8601 timestamp', () => {
      const error = validateDateFormat('2024-12-31T23:59:59.999Z');
      expect(error).toBeNull();
    });

    test('should accept ISO 8601 timestamp without milliseconds', () => {
      const error = validateDateFormat('2024-12-31T23:59:59Z');
      expect(error).toBeNull();
    });

    test('should reject non-string date', () => {
      const error = validateDateFormat(20241231);
      expect(error).toBe('Date must be a string');
    });

    test('should reject invalid date format', () => {
      const error = validateDateFormat('12/31/2024');
      expect(error).toContain('ISO 8601 format');
    });

    test('should reject malformed ISO date', () => {
      const error = validateDateFormat('2024-13-01');
      expect(error).toBe('Invalid date value');
    });

    test('should reject invalid day', () => {
      const error = validateDateFormat('2024-02-30');
      expect(error).toBe('Invalid date value');
    });

    test('should reject empty string', () => {
      const error = validateDateFormat('');
      expect(error).toContain('ISO 8601 format');
    });
  });

  describe('validateAssignee', () => {
    test('should accept valid email address', () => {
      const error = validateAssignee('user@example.com');
      expect(error).toBeNull();
    });

    test('should accept email with subdomain', () => {
      const error = validateAssignee('user@mail.example.com');
      expect(error).toBeNull();
    });

    test('should accept email with plus sign', () => {
      const error = validateAssignee('user+tag@example.com');
      expect(error).toBeNull();
    });

    test('should accept email with dots', () => {
      const error = validateAssignee('first.last@example.com');
      expect(error).toBeNull();
    });

    test('should reject email without @', () => {
      const error = validateAssignee('userexample.com');
      expect(error).toBe('Assignee must be a valid email address');
    });

    test('should reject email without domain', () => {
      const error = validateAssignee('user@');
      expect(error).toBe('Assignee must be a valid email address');
    });

    test('should reject email without TLD', () => {
      const error = validateAssignee('user@example');
      expect(error).toBe('Assignee must be a valid email address');
    });

    test('should reject email with spaces', () => {
      const error = validateAssignee('user @example.com');
      expect(error).toBe('Assignee must be a valid email address');
    });

    test('should reject empty string', () => {
      const error = validateAssignee('');
      expect(error).toBe('Assignee must be a valid email address');
    });

    test('should reject non-string assignee', () => {
      const error = validateAssignee(123);
      expect(error).toBe('Assignee must be a string');
    });

    test('should reject assignee exceeding max length', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const error = validateAssignee(longEmail);
      expect(error).toBe('Assignee must not exceed 255 characters');
    });
  });

  describe('validateTaskInput', () => {
    test('should validate complete valid task', () => {
      const result = validateTaskInput({
        description: 'Valid task',
        assignee: 'user@example.com',
        priority: 'P1',
        status: 'open',
        dueDate: '2024-12-31'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate task with only required fields', () => {
      const result = validateTaskInput({
        description: 'Minimal task'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject task without description', () => {
      const result = validateTaskInput({
        priority: 'P1'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Description is required');
    });

    test('should collect multiple validation errors', () => {
      const result = validateTaskInput({
        description: '',
        priority: 'invalid',
        status: 'invalid',
        dueDate: 'invalid'
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    test('should reject assignee exceeding max length', () => {
      const result = validateTaskInput({
        description: 'Valid task',
        assignee: 'a'.repeat(250) + '@example.com'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Assignee must not exceed 255 characters');
    });

    test('should reject non-string assignee', () => {
      const result = validateTaskInput({
        description: 'Valid task',
        assignee: 123 as unknown as string
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Assignee must be a string');
    });

    test('should reject invalid email format', () => {
      const result = validateTaskInput({
        description: 'Valid task',
        assignee: 'not-an-email'
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Assignee must be a valid email address');
    });

    test('should accept null optional fields', () => {
      const result = validateTaskInput({
        description: 'Valid task',
        assignee: null,
        priority: null,
        status: null,
        dueDate: null
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateLimit', () => {
    test('should accept valid limit as number', () => {
      expect(validateLimit(20)).toBeNull();
    });

    test('should accept valid limit as string', () => {
      expect(validateLimit('50')).toBeNull();
    });

    test('should accept minimum limit', () => {
      expect(validateLimit(1)).toBeNull();
    });

    test('should accept maximum limit', () => {
      expect(validateLimit(100)).toBeNull();
    });

    test('should reject non-numeric limit', () => {
      expect(validateLimit('abc')).toBe('Limit must be a number');
    });

    test('should reject decimal limit', () => {
      expect(validateLimit(20.5)).toBe('Limit must be an integer');
    });

    test('should reject limit below minimum', () => {
      expect(validateLimit(0)).toBe('Limit must be at least 1');
    });

    test('should reject negative limit', () => {
      expect(validateLimit(-5)).toBe('Limit must be at least 1');
    });

    test('should reject limit above maximum', () => {
      expect(validateLimit(101)).toBe('Limit must not exceed 100');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string limit', () => {
      expect(validateLimit('')).toBe('Limit must be at least 1');
    });

    test('should handle null limit', () => {
      expect(validateLimit(null)).toBe('Limit must be at least 1');
    });
  });
});
