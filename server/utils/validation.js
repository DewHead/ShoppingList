function validateProduct(product) {
    if (!product.remote_name || product.remote_name.trim() === '') {
        return { isValid: false, reason: 'Name is missing' };
    }
    
    if (product.price === undefined || product.price === null || isNaN(product.price)) {
         return { isValid: false, reason: 'Price is invalid' };
    }

    if (product.price <= 0) {
        return { isValid: false, reason: 'Price must be positive' };
    }

    if (product.price > 1000) {
        return { isValid: false, reason: 'Price is suspiciously high (>1000)' };
    }

    return { isValid: true };
}

module.exports = { validateProduct };
