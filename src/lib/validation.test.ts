import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidEmail,
  validateDonationInput,
  validateLoginInput,
  validateSignupInput,
  validateUploadFile,
} from './validation';

function makeFile(name: string, type: string, size: number) {
  return new File(['x'.repeat(size)], name, { type });
}

test('validates email format', () => {
  assert.equal(isValidEmail('person@example.com'), true);
  assert.equal(isValidEmail('bad-email'), false);
});

test('validates login input', () => {
  assert.equal(validateLoginInput('person@example.com', 'secret'), null);
  assert.equal(validateLoginInput('bad-email', 'secret'), 'Enter a valid email address.');
  assert.equal(validateLoginInput('person@example.com', ''), 'Enter your password.');
});

test('validates signup input', () => {
  assert.equal(validateSignupInput('Asha', 'Rao', 'asha@example.com', 'secret1'), null);
  assert.equal(validateSignupInput('', 'Rao', 'asha@example.com', 'secret1'), 'Enter your first name.');
  assert.equal(validateSignupInput('Asha', 'Rao', 'asha@example.com', '123'), 'Password must be at least 6 characters.');
});

test('validates donation input', () => {
  assert.equal(validateDonationInput('Asha Rao', '501', makeFile('proof.png', 'image/png', 100)), null);
  assert.equal(validateDonationInput('', '501', makeFile('proof.png', 'image/png', 100)), 'Enter your full name.');
  assert.equal(validateDonationInput('Asha Rao', '0', makeFile('proof.png', 'image/png', 100)), 'Enter a valid donation amount.');
  assert.equal(validateDonationInput('Asha Rao', '501', makeFile('proof.pdf', 'application/pdf', 100)), 'Payment proof must be an image file.');
});

test('validates generic uploads', () => {
  assert.equal(validateUploadFile(makeFile('photo.png', 'image/png', 100), ['image/']), null);
  assert.equal(validateUploadFile(makeFile('clip.mp4', 'video/mp4', 100), ['image/']), 'Unsupported file type: video/mp4.');
});
