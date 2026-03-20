#!/usr/bin/env node

import { main } from './index.js';

main().catch((error) => {
  console.error('Fatal:', error.message);
  process.exit(1);
});
