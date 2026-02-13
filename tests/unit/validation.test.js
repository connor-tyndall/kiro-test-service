const {
  validateTaskInput,
  validatePriority,
  validateStatus,
  validateDateFormat,
  validateDescription,
  validateAssignee,
  validateLimit,
  validateNextToken,
  stripHtmlTags,
  stripControlCharacters,
  sanitizeStringFields,
  hasPrototypePollution,
  containsPrototypePollutionKeys,
  validateRequestBodySize,
  VALID_PRIORITIES,
  VALID_STATUSES,
  MAX_REQUEST_BODY_SIZE
} = require('../../src/lib/validation');

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
        assignee: 123
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

    test('should reject malformed base64 nextToken', () => {
      expect(validateNextToken('not-valid-base64!!!')).toBe('Invalid nextToken parameter');
    });

    test('should reject empty nextToken', () => {
      expect(validateNextToken('')).toBe('Invalid nextToken parameter');
    });

    test('should reject whitespace-only nextToken', () => {
      expect(validateNextToken('   ')).toBe('Invalid nextToken parameter');
    });
  });

  describe('validateNextToken', () => {
    test('should accept valid base64-encoded JSON token', () => {
      const validKey = { PK: 'TASK#123', SK: 'TASK#123' };
      const validToken = Buffer.from(JSON.stringify(validKey)).toString('base64');
      expect(validateNextToken(validToken)).toBeNull();
    });

    test('should accept valid base64-encoded complex JSON token', () => {
      const validKey = { PK: 'TASK#abc-def-123', SK: 'TASK#abc-def-123', assignee: 'user@example.com' };
      const validToken = Buffer.from(JSON.stringify(validKey)).toString('base64');
      expect(validateNextToken(validToken)).toBeNull();
    });

    test('should reject malformed base64 string', () => {
      const error = validateNextToken('!!!invalid-base64!!!');
      expect(error).toBe('Invalid nextToken parameter');
    });

    test('should reject base64 string that decodes to non-JSON', () => {
      const nonJsonToken = Buffer.from('not a json string').toString('base64');
      expect(validateNextToken(nonJsonToken)).toBe('Invalid nextToken parameter');
    });

    test('should reject empty string', () => {
      expect(validateNextToken('')).toBe('Invalid nextToken parameter');
    });

    test('should reject whitespace-only string', () => {
      expect(validateNextToken('   ')).toBe('Invalid nextToken parameter');
    });

    test('should reject non-string input', () => {
      expect(validateNextToken(12345)).toBe('Invalid nextToken parameter');
    });

    test('should reject null input', () => {
      expect(validateNextToken(null)).toBe('Invalid nextToken parameter');
    });

    test('should reject undefined input', () => {
      expect(validateNextToken(undefined)).toBe('Invalid nextToken parameter');
    });

    test('should reject partially valid base64 with padding issues', () => {
      const error = validateNextToken('abc');
      expect(error).toBe('Invalid nextToken parameter');
    });

    test('should reject base64 that looks valid but contains invalid JSON', () => {
      const invalidJson = Buffer.from('{invalid: json}').toString('base64');
      expect(validateNextToken(invalidJson)).toBe('Invalid nextToken parameter');
    });
  });

  describe('stripHtmlTags', () => {
    test('should remove basic script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      expect(stripHtmlTags(input)).toBe('Hello');
    });

    test('should remove script tags with attributes', () => {
      const input = '<script type="text/javascript">alert("xss")</script>World';
      expect(stripHtmlTags(input)).toBe('World');
    });

    test('should remove img tags with onerror', () => {
      const input = 'Test <img src="x" onerror="alert(1)"> text';
      expect(stripHtmlTags(input)).toBe('Test  text');
    });

    test('should remove img tags with onload', () => {
      const input = 'Before <img onload="alert(1)" src="valid.jpg"> After';
      expect(stripHtmlTags(input)).toBe('Before  After');
    });

    test('should remove img tags with javascript: src', () => {
      const input = 'Test <img src="javascript:alert(1)"> here';
      expect(stripHtmlTags(input)).toBe('Test  here');
    });

    test('should remove inline event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      expect(stripHtmlTags(input)).toBe('Click me');
    });

    test('should remove various event handlers', () => {
      const input = '<a onmouseover="alert(1)" href="#">Link</a>';
      expect(stripHtmlTags(input)).toBe('Link');
    });

    test('should sanitize javascript: URLs in href', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      expect(stripHtmlTags(input)).not.toContain('javascript:');
    });

    test('should remove HTML entities used for encoding', () => {
      const input = '&#60;script&#62;alert(1)&#60;/script&#62;';
      expect(stripHtmlTags(input)).toBe('scriptalert(1)/script');
    });

    test('should handle uppercase tags', () => {
      const input = '<SCRIPT>alert("xss")</SCRIPT>Safe';
      expect(stripHtmlTags(input)).toBe('Safe');
    });

    test('should handle mixed case tags', () => {
      const input = '<ScRiPt>alert("xss")</sCrIpT>Test';
      expect(stripHtmlTags(input)).toBe('Test');
    });

    test('should preserve non-HTML content', () => {
      const input = 'Normal text without any HTML';
      expect(stripHtmlTags(input)).toBe('Normal text without any HTML');
    });

    test('should handle empty string', () => {
      expect(stripHtmlTags('')).toBe('');
    });

    test('should return non-string inputs unchanged', () => {
      expect(stripHtmlTags(123)).toBe(123);
      expect(stripHtmlTags(null)).toBe(null);
      expect(stripHtmlTags(undefined)).toBe(undefined);
    });

    test('should handle multiple script tags', () => {
      const input = '<script>a</script>Hello<script>b</script>World';
      expect(stripHtmlTags(input)).toBe('HelloWorld');
    });

    test('should remove SVG with onload', () => {
      const input = '<svg onload="alert(1)">content</svg>';
      expect(stripHtmlTags(input)).toBe('content');
    });

    test('should handle bypass attempt with nested tags', () => {
      const input = '<<script>script>alert(1)<</script>/script>';
      const result = stripHtmlTags(input);
      expect(result).not.toContain('<script>');
    });

    test('should handle bypass attempt with encoded angle brackets', () => {
      const input = '&#x3c;script&#x3e;alert(1)&#x3c;/script&#x3e;';
      const result = stripHtmlTags(input);
      expect(result).not.toContain('&#x3c;');
      expect(result).not.toContain('&#x3e;');
    });
  });

  describe('stripControlCharacters', () => {
    test('should remove null bytes', () => {
      const input = 'Hello\x00World';
      expect(stripControlCharacters(input)).toBe('HelloWorld');
    });

    test('should remove ASCII control characters except newline', () => {
      const input = 'Test\x01\x02\x03\x04text';
      expect(stripControlCharacters(input)).toBe('Testtext');
    });

    test('should preserve newlines (0x0A)', () => {
      const input = 'Line1\nLine2';
      expect(stripControlCharacters(input)).toBe('Line1\nLine2');
    });

    test('should remove tab characters (0x09)', () => {
      const input = 'Hello\tWorld';
      expect(stripControlCharacters(input)).toBe('HelloWorld');
    });

    test('should remove carriage returns (0x0D)', () => {
      const input = 'Hello\rWorld';
      expect(stripControlCharacters(input)).toBe('HelloWorld');
    });

    test('should remove vertical tab (0x0B)', () => {
      const input = 'Hello\x0BWorld';
      expect(stripControlCharacters(input)).toBe('HelloWorld');
    });

    test('should remove form feed (0x0C)', () => {
      const input = 'Hello\x0CWorld';
      expect(stripControlCharacters(input)).toBe('HelloWorld');
    });

    test('should handle empty string', () => {
      expect(stripControlCharacters('')).toBe('');
    });

    test('should return non-string inputs unchanged', () => {
      expect(stripControlCharacters(123)).toBe(123);
      expect(stripControlCharacters(null)).toBe(null);
      expect(stripControlCharacters(undefined)).toBe(undefined);
    });

    test('should remove escape character (0x1B)', () => {
      const input = 'Test\x1BEscape';
      expect(stripControlCharacters(input)).toBe('TestEscape');
    });

    test('should handle multiple control characters', () => {
      const input = '\x00\x01Hello\x02\x03World\x04\x05';
      expect(stripControlCharacters(input)).toBe('HelloWorld');
    });

    test('should preserve characters above 0x1F', () => {
      const input = 'Hello World! @#$%^&*()';
      expect(stripControlCharacters(input)).toBe('Hello World! @#$%^&*()');
    });

    test('should handle string with only control characters', () => {
      const input = '\x00\x01\x02\x03';
      expect(stripControlCharacters(input)).toBe('');
    });

    test('should preserve Unicode characters', () => {
      const input = 'Hello 世界 🌍';
      expect(stripControlCharacters(input)).toBe('Hello 世界 🌍');
    });
  });

  describe('sanitizeStringFields', () => {
    test('should sanitize string values in object', () => {
      const input = { name: 'Test\x00Value', count: 5 };
      const result = sanitizeStringFields(input);
      expect(result.name).toBe('TestValue');
      expect(result.count).toBe(5);
    });

    test('should handle nested objects', () => {
      const input = { outer: { inner: 'Nested\x01Text' } };
      const result = sanitizeStringFields(input);
      expect(result.outer.inner).toBe('NestedText');
    });

    test('should preserve non-string values', () => {
      const input = { 
        num: 42, 
        bool: true, 
        arr: [1, 2, 3], 
        nil: null 
      };
      const result = sanitizeStringFields(input);
      expect(result.num).toBe(42);
      expect(result.bool).toBe(true);
      expect(result.arr).toEqual([1, 2, 3]);
      expect(result.nil).toBe(null);
    });

    test('should return null for null input', () => {
      expect(sanitizeStringFields(null)).toBe(null);
    });

    test('should return primitives unchanged', () => {
      expect(sanitizeStringFields(123)).toBe(123);
      expect(sanitizeStringFields('string')).toBe('string');
    });
  });

  describe('hasPrototypePollution', () => {
    test('should detect __proto__ key when set via Object.create', () => {
      // Note: __proto__ as an object literal key doesn't create an enumerable property
      // in JavaScript - it modifies the prototype chain instead.
      // The containsPrototypePollutionKeys function handles __proto__ detection via string scanning.
      // This test verifies hasPrototypePollution can detect it if somehow it becomes a real property.
      const input = Object.create(null);
      input['__proto__'] = { polluted: true };
      expect(hasPrototypePollution(input)).toBe(true);
    });

    test('should detect constructor key', () => {
      const input = { constructor: { prototype: { polluted: true } } };
      expect(hasPrototypePollution(input)).toBe(true);
    });

    test('should detect prototype key', () => {
      const input = { prototype: { polluted: true } };
      expect(hasPrototypePollution(input)).toBe(true);
    });

    test('should detect nested constructor', () => {
      const input = { data: { nested: { constructor: { polluted: true } } } };
      expect(hasPrototypePollution(input)).toBe(true);
    });

    test('should detect constructor in array elements', () => {
      const input = { items: [{ constructor: { polluted: true } }] };
      expect(hasPrototypePollution(input)).toBe(true);
    });

    test('should return false for safe objects', () => {
      const input = { name: 'test', value: 123, nested: { safe: true } };
      expect(hasPrototypePollution(input)).toBe(false);
    });

    test('should return false for null', () => {
      expect(hasPrototypePollution(null)).toBe(false);
    });

    test('should return false for primitives', () => {
      expect(hasPrototypePollution(123)).toBe(false);
      expect(hasPrototypePollution('string')).toBe(false);
      expect(hasPrototypePollution(true)).toBe(false);
    });

    test('should return false for empty object', () => {
      expect(hasPrototypePollution({})).toBe(false);
    });

    test('should return false for array without pollution', () => {
      expect(hasPrototypePollution({ items: [1, 2, 3] })).toBe(false);
    });

    test('should detect constructor.prototype bypass attempt', () => {
      const input = { constructor: { prototype: { polluted: true } } };
      expect(hasPrototypePollution(input)).toBe(true);
    });

    test('should handle deeply nested constructor pollution attempts', () => {
      const input = { 
        level1: { 
          level2: { 
            level3: { 
              constructor: { polluted: true } 
            } 
          } 
        } 
      };
      expect(hasPrototypePollution(input)).toBe(true);
    });
  });

  describe('validateRequestBodySize', () => {
    test('should accept body under limit', () => {
      const body = 'a'.repeat(1000);
      expect(validateRequestBodySize(body)).toBeNull();
    });

    test('should accept body at exactly limit', () => {
      const body = 'a'.repeat(MAX_REQUEST_BODY_SIZE);
      expect(validateRequestBodySize(body)).toBeNull();
    });

    test('should reject body over limit', () => {
      const body = 'a'.repeat(MAX_REQUEST_BODY_SIZE + 1);
      expect(validateRequestBodySize(body)).toContain('exceeds maximum allowed size');
    });

    test('should accept null body', () => {
      expect(validateRequestBodySize(null)).toBeNull();
    });

    test('should accept undefined body', () => {
      expect(validateRequestBodySize(undefined)).toBeNull();
    });

    test('should handle empty string', () => {
      expect(validateRequestBodySize('')).toBeNull();
    });

    test('should calculate size correctly for UTF-8 characters', () => {
      // UTF-8 characters can be multiple bytes
      const emoji = '🌍'.repeat(2600); // Each emoji is 4 bytes
      expect(validateRequestBodySize(emoji)).toContain('exceeds maximum allowed size');
    });

    test('should reject significantly oversized body', () => {
      const body = 'a'.repeat(50000);
      expect(validateRequestBodySize(body)).toContain('exceeds maximum allowed size');
    });
  });

  describe('containsPrototypePollutionKeys', () => {
    test('should detect __proto__ key in JSON string', () => {
      const input = '{"__proto__": {"polluted": true}}';
      expect(containsPrototypePollutionKeys(input)).toBe(true);
    });

    test('should detect constructor key in JSON string', () => {
      const input = '{"constructor": {"prototype": {"polluted": true}}}';
      expect(containsPrototypePollutionKeys(input)).toBe(true);
    });

    test('should detect prototype key in JSON string', () => {
      const input = '{"prototype": {"polluted": true}}';
      expect(containsPrototypePollutionKeys(input)).toBe(true);
    });

    test('should detect nested __proto__ in JSON string', () => {
      const input = '{"data": {"nested": {"__proto__": {"polluted": true}}}}';
      expect(containsPrototypePollutionKeys(input)).toBe(true);
    });

    test('should return false for safe JSON string', () => {
      const input = '{"name": "test", "value": 123}';
      expect(containsPrototypePollutionKeys(input)).toBe(false);
    });

    test('should return false for null input', () => {
      expect(containsPrototypePollutionKeys(null)).toBe(false);
    });

    test('should return false for non-string input', () => {
      expect(containsPrototypePollutionKeys(123)).toBe(false);
      expect(containsPrototypePollutionKeys({})).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(containsPrototypePollutionKeys('')).toBe(false);
    });

    test('should detect __proto__ with whitespace variations', () => {
      const input = '{"__proto__"  :  {"polluted": true}}';
      expect(containsPrototypePollutionKeys(input)).toBe(true);
    });

    test('should detect constructor with whitespace variations', () => {
      const input = '{ "constructor" : {} }';
      expect(containsPrototypePollutionKeys(input)).toBe(true);
    });

    test('should not match __proto__ as a value', () => {
      const input = '{"key": "__proto__"}';
      expect(containsPrototypePollutionKeys(input)).toBe(false);
    });

    test('should detect bypass attempt using different casing', () => {
      // Case-insensitive check
      const input = '{"__PROTO__": {"polluted": true}}';
      expect(containsPrototypePollutionKeys(input)).toBe(true);
    });
  });
});
