const { validateProduct } = require('../utils/validation');

describe('Product Validation Logic', () => {
    it('should accept valid products', () => {
        const validProduct = {
            remote_name: 'Valid Milk',
            price: 5.90,
            remote_id: '123'
        };
        const result = validateProduct(validProduct);
        expect(result.isValid).toBe(true);
    });

    it('should reject products with price <= 0', () => {
        const invalidProduct = {
            remote_name: 'Free Milk',
            price: 0,
            remote_id: '123'
        };
        const result = validateProduct(invalidProduct);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('Price must be positive');
    });

    it('should reject products with missing name', () => {
        const invalidProduct = {
            remote_name: '',
            price: 5.90,
            remote_id: '123'
        };
        const result = validateProduct(invalidProduct);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('Name is missing');
    });

    it('should reject suspicious high prices (> 1000)', () => {
        const invalidProduct = {
            remote_name: 'Expensive Steak',
            price: 1001,
            remote_id: '123'
        };
        const result = validateProduct(invalidProduct);
        expect(result.isValid).toBe(false);
        expect(result.reason).toContain('Price is suspiciously high');
    });
});
