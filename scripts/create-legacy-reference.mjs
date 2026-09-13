#!/usr/bin/env node

import {randomBytes} from "node:crypto";
import {stdout} from "node:process";
import {createLegacyReference} from "../lib/legacy-reference.mjs";

try {
  const reference = createLegacyReference({randomBytes});
  stdout.write(`Legacy reference: ${reference.display}\n`);
  stdout.write("Validation: provisional; not validated by ChatGPT host metadata\n");
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
