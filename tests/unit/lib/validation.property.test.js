const fc = require('fast-check');
const {
  validateDescription,
  validatePriority,
  validateDateFormat,
  validateAssignee
} = require('../../../src/lib/validation');

describe('Validation Module - Property-Based Tests', () => {
  describe('validateDescription', () => {
    test('should accept any non-empty, non-whitespace string <= 1000 chars', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          (description) => {
            const error = validateDescription(description);
            return error === null;
          }
        ),
        { numRuns: 500 }
      );
    });

    test('should reject any string > 1000 chars', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1001, maxLength: 2000 }),
          (description) => {
            const error = validateDescription(description);
            return error === 'Description must not exceed 1000 characters';
          }
        ),
        { numRuns: 500 }
      );
    });

    test('should reject empty strings', () => {
      const error = validateDescription('');
      expect(error).toBe('Description cannot be empty or whitespace only');
    });

    test('should reject whitespace-only strings of any length', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 100 }),
          (whitespaceString) => {
            const error = validateDescription(whitespaceString);
            return error === 'Description cannot be empty or whitespace only';
          }
        ),
        { numRuns: 200 }
      );
    });

    test('should reject non-string types', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.double(),
            fc.boolean(),
            fc.array(fc.anything()),
            fc.object()
          ),
          (nonString) => {
            const error = validateDescription(nonString);
            return error === 'Description must be a string';
          }
        ),
        { numRuns: 200 }
      );
    });

    test('should accept strings at exactly 1000 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1000, maxLength: 1000 }).filter(s => s.trim().length > 0),
          (description) => {
            const error = validateDescription(description);
            return error === null;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject strings at exactly 1001 characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1001, maxLength: 1001 }),
          (description) => {
            const error = validateDescription(description);
            return error === 'Description must not exceed 1000 characters';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validatePriority', () => {
    const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'];

    test('should accept only P0-P4', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_PRIORITIES),
          (priority) => {
            const error = validatePriority(priority);
            return error === null;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject any other string (excluding P0-P4)', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !VALID_PRIORITIES.includes(s)),
          (invalidPriority) => {
            const error = validatePriority(invalidPriority);
            return error === 'Priority must be one of: P0, P1, P2, P3, P4';
          }
        ),
        { numRuns: 500 }
      );
    });

    test('should reject lowercase variants', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('p0', 'p1', 'p2', 'p3', 'p4'),
          (lowercasePriority) => {
            const error = validatePriority(lowercasePriority);
            return error === 'Priority must be one of: P0, P1, P2, P3, P4';
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should reject priorities with extra characters', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...VALID_PRIORITIES),
          fc.string({ minLength: 1, maxLength: 5 }),
          (validPriority, suffix) => {
            const invalidPriority = validPriority + suffix;
            const error = validatePriority(invalidPriority);
            return error === 'Priority must be one of: P0, P1, P2, P3, P4';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject numeric values', () => {
      fc.assert(
        fc.property(
          fc.integer(),
          (num) => {
            const error = validatePriority(num);
            return error === 'Priority must be one of: P0, P1, P2, P3, P4';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateDateFormat', () => {
    test('should accept valid ISO 8601 date strings (YYYY-MM-DD)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1970, max: 2099 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }), // Use 28 to avoid month-day edge cases
          (year, month, day) => {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const error = validateDateFormat(dateStr);
            return error === null;
          }
        ),
        { numRuns: 500 }
      );
    });

    test('should accept valid ISO 8601 timestamps', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('1970-01-01'), max: new Date('2099-12-31') }),
          (date) => {
            const dateStr = date.toISOString();
            const error = validateDateFormat(dateStr);
            return error === null;
          }
        ),
        { numRuns: 500 }
      );
    });

    test('should reject invalid dates with month > 12', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          fc.integer({ min: 13, max: 99 }),
          fc.integer({ min: 1, max: 28 }),
          (year, invalidMonth, day) => {
            const dateStr = `${year}-${String(invalidMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const error = validateDateFormat(dateStr);
            return error !== null;
          }
        ),
        { numRuns: 200 }
      );
    });

    test('should reject February 30 for any year', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            const dateStr = `${year}-02-30`;
            const error = validateDateFormat(dateStr);
            return error === 'Invalid date value';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject April 31 for any year', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2000, max: 2099 }),
          (year) => {
            const dateStr = `${year}-04-31`;
            const error = validateDateFormat(dateStr);
            return error === 'Invalid date value';
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject random strings that do not match date format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
            !(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(s))
          ),
          (randomString) => {
            const error = validateDateFormat(randomString);
            return error !== null;
          }
        ),
        { numRuns: 500 }
      );
    });

    test('should reject non-string types', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.double(),
            fc.boolean(),
            fc.array(fc.anything()),
            fc.object()
          ),
          (nonString) => {
            const error = validateDateFormat(nonString);
            return error === 'Date must be a string';
          }
        ),
        { numRuns: 200 }
      );
    });

    test('should reject date-like strings in wrong format (MM/DD/YYYY)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          fc.integer({ min: 2000, max: 2099 }),
          (month, day, year) => {
            const dateStr = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
            const error = validateDateFormat(dateStr);
            return error !== null;
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('validateAssignee', () => {
    test('should accept valid email patterns', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const error = validateAssignee(email);
            return error === null;
          }
        ),
        { numRuns: 500 }
      );
    });

    test('should reject strings without @ symbol', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes('@') && s.trim().length > 0),
          (noAtString) => {
            const error = validateAssignee(noAtString);
            return error === 'Assignee must be a valid email address';
          }
        ),
        { numRuns: 500 }
      );
    });

    test('should reject strings with spaces', () => {
      fc.assert(
        fc.property(
          // Generate strings that contain at least one space
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.string({ minLength: 1, maxLength: 30 })
          ).map(([a, b]) => `${a} ${b}@example.com`),
          (stringWithSpace) => {
            const error = validateAssignee(stringWithSpace);
            return error === 'Assignee must be a valid email address';
          }
        ),
        { numRuns: 200 }
      );
    });

    test('should reject email-like strings with spaces anywhere', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'user @example.com',
            'user@ example.com',
            'user@example .com',
            ' user@example.com',
            'user@example.com ',
            'us er@example.com'
          ),
          (emailWithSpace) => {
            const error = validateAssignee(emailWithSpace);
            return error === 'Assignee must be a valid email address';
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should reject non-string types', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.double(),
            fc.boolean(),
            fc.array(fc.anything()),
            fc.object()
          ),
          (nonString) => {
            const error = validateAssignee(nonString);
            return error === 'Assignee must be a string';
          }
        ),
        { numRuns: 200 }
      );
    });

    test('should reject empty string', () => {
      const error = validateAssignee('');
      expect(error).toBe('Assignee must be a valid email address');
    });

    test('should reject emails without domain part after @', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@') && !s.includes(' ')),
          (localPart) => {
            const invalidEmail = `${localPart}@`;
            const error = validateAssignee(invalidEmail);
            return error === 'Assignee must be a valid email address';
          }
        ),
        { numRuns: 200 }
      );
    });

    test('should reject emails without TLD (top-level domain)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('@') && !s.includes(' ') && !s.includes('.')),
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('@') && !s.includes(' ') && !s.includes('.')),
          (localPart, domain) => {
            const invalidEmail = `${localPart}@${domain}`;
            const error = validateAssignee(invalidEmail);
            return error === 'Assignee must be a valid email address';
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Edge Cases', () => {
    test('description: should handle unicode characters within limit', () => {
      fc.assert(
        fc.property(
          fc.unicodeString({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          (unicodeDesc) => {
            const error = validateDescription(unicodeDesc);
            // Should either be valid (null) or fail on length
            return error === null || error === 'Description must not exceed 1000 characters';
          }
        ),
        { numRuns: 200 }
      );
    });

    test('priority: should reject null and undefined', () => {
      expect(validatePriority(null)).toBe('Priority must be one of: P0, P1, P2, P3, P4');
      expect(validatePriority(undefined)).toBe('Priority must be one of: P0, P1, P2, P3, P4');
    });

    test('date: should handle leap year edge cases', () => {
      // Feb 29 should be valid on leap years
      expect(validateDateFormat('2024-02-29')).toBeNull(); // 2024 is a leap year
      expect(validateDateFormat('2020-02-29')).toBeNull(); // 2020 is a leap year
      
      // Feb 29 should be invalid on non-leap years
      expect(validateDateFormat('2023-02-29')).toBe('Invalid date value');
      expect(validateDateFormat('2021-02-29')).toBe('Invalid date value');
    });

    test('assignee: should handle very long valid emails up to 255 chars', () => {
      const longLocalPart = 'a'.repeat(240);
      const email = `${longLocalPart}@b.co`;
      expect(email.length).toBe(245); // 240 + 1(@) + 1(b) + 1(.) + 2(co) = 245
      expect(validateAssignee(email)).toBeNull();
    });

    test('assignee: should reject emails exceeding 255 chars', () => {
      const longLocalPart = 'a'.repeat(250);
      const email = `${longLocalPart}@example.com`;
      expect(email.length).toBeGreaterThan(255);
      expect(validateAssignee(email)).toBe('Assignee must not exceed 255 characters');
    });

    test('date: should handle timestamp without Z suffix', () => {
      // Note: The validator accepts timestamps without Z suffix
      // This test documents current behavior
      const result = validateDateFormat('2024-06-15T10:30:00');
      expect(result).toBeNull();
    });

    test('date: should handle timestamp with milliseconds but no Z', () => {
      const result = validateDateFormat('2024-06-15T10:30:00.123');
      expect(result).toBeNull();
    });
  });
});
