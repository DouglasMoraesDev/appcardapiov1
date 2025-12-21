import '@testing-library/jest-dom';
// Corrige erro de TextEncoder ausente no ambiente Node
global.TextEncoder = require('util').TextEncoder;
