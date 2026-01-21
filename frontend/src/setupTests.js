import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global Mocks needed for Components
window.scrollTo = vi.fn();
window.alert = vi.fn();

// Mock console.error to avoid polluting output during tests (optional)
// console.error = vi.fn();
