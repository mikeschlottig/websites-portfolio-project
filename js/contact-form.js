// Contact Form Handler
class ContactForm {
    constructor(formSelector) {
        this.form = document.querySelector(formSelector);
        this.apiEndpoint = '/api/contact';
        this.init();
    }

    init() {
        if (!this.form) return;

        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.setupValidation();
    }

    setupValidation() {
        const inputs = this.form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', this.clearErrors.bind(this));
        });
    }

    validateField(event) {
        const field = event.target;
        const value = field.value.trim();
        const fieldType = field.type || field.tagName.toLowerCase();

        this.clearFieldError(field);

        // Required field validation
        if (field.hasAttribute('required') && !value) {
            this.showFieldError(field, `${this.getFieldLabel(field)} is required`);
            return false;
        }

        // Email validation
        if (fieldType === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.showFieldError(field, 'Please enter a valid email address');
                return false;
            }
        }

        // Minimum length validation
        if (field.hasAttribute('minlength')) {
            const minLength = parseInt(field.getAttribute('minlength'));
            if (value.length < minLength) {
                this.showFieldError(field, `${this.getFieldLabel(field)} must be at least ${minLength} characters`);
                return false;
            }
        }

        return true;
    }

    getFieldLabel(field) {
        const label = this.form.querySelector(`label[for="${field.id}"]`);
        return label ? label.textContent.replace('*', '').trim() : field.name || 'Field';
    }

    showFieldError(field, message) {
        field.classList.add('error');

        // Remove existing error message
        this.clearFieldError(field);

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    clearErrors() {
        const errorFields = this.form.querySelectorAll('.error');
        const errorMessages = this.form.querySelectorAll('.field-error');

        errorFields.forEach(field => field.classList.remove('error'));
        errorMessages.forEach(error => error.remove());
    }

    validateForm() {
        const inputs = this.form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField({ target: input })) {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleSubmit(event) {
        event.preventDefault();

        // Clear previous errors
        this.clearErrors();
        this.hideMessage();

        // Validate form
        if (!this.validateForm()) {
            this.showMessage('Please correct the errors above', 'error');
            return;
        }

        // Get form data
        const formData = new FormData(this.form);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            message: formData.get('message'),
            company: formData.get('company') || undefined
        };

        try {
            this.setSubmitting(true);

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Thank you! Your message has been sent successfully.', 'success');
                this.form.reset();

                // Optional: Track successful submission
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'contact_form_submit', {
                        event_category: 'engagement',
                        event_label: 'success'
                    });
                }
            } else {
                this.showMessage(result.error || 'Failed to send message. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Contact form error:', error);
            this.showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            this.setSubmitting(false);
        }
    }

    setSubmitting(isSubmitting) {
        const submitButton = this.form.querySelector('button[type="submit"]');
        const spinner = this.form.querySelector('.submit-spinner');

        if (submitButton) {
            submitButton.disabled = isSubmitting;
            submitButton.textContent = isSubmitting ? 'Sending...' : 'Send Message';
        }

        if (spinner) {
            spinner.style.display = isSubmitting ? 'inline-block' : 'none';
        }
    }

    showMessage(message, type = 'info') {
        let messageDiv = this.form.querySelector('.form-message');

        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.className = 'form-message';
            this.form.insertBefore(messageDiv, this.form.firstChild);
        }

        messageDiv.textContent = message;
        messageDiv.className = `form-message ${type}`;
        messageDiv.style.display = 'block';

        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => this.hideMessage(), 5000);
        }
    }

    hideMessage() {
        const messageDiv = this.form.querySelector('.form-message');
        if (messageDiv) {
            messageDiv.style.display = 'none';
        }
    }
}

// Initialize contact form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize contact form if it exists
    const contactForm = new ContactForm('#contact-form');

    // Optional: Initialize multiple forms
    document.querySelectorAll('.contact-form').forEach((form, index) => {
        new ContactForm(`#${form.id || 'contact-form-' + index}`);
    });
});