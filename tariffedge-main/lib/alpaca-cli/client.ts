/**
 * Alpaca CLI Integration Layer
 * 
 * HACKATHON REQUIREMENT: Routes order submission and account operations through
 * Alpaca's official CLI tool (github.com/alpacahq/cli) instead of raw SDK calls.
 * 
 * The CLI is designed for AI agent automation and returns structured JSON output.
 * 
 * Setup:
 * 1. Install CLI: go install github.com/alpacahq/cli/cmd/alpaca@latest
 * 2. Auth with API keys: alpaca profile login --api-key
 * 3. Set env vars: ALPACA_API_KEY, ALPACA_SECRET_KEY
 * 
 * OR use env-based auth (no profile needed):
 * - CLI automatically reads ALPACA_API_KEY and ALPACA_SECRET_KEY from env
 */

import { spawn } from 'child_process';

/**
 * CLI command result
 */
export interface CLIResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  stderr?: string;
  exitCode: number;
}

/**
 * Execute Alpaca CLI command and return parsed JSON
 * 
 * @param args CLI command args (e.g. ['account', 'get'])
 * @param input Optional JSON input for stdin (for POST commands)
 * @returns Parsed JSON response or error
 */
export async function executeAlpacaCLI<T = any>(
  args: string[],
  input?: any
): Promise<CLIResult<T>> {
  return new Promise((resolve) => {
    // Ensure JSON output format
    const fullArgs = [...args, '--output', 'json'];
    
    console.log(`[ALPACA CLI] Executing: alpaca ${fullArgs.join(' ')}`);

    const proc = spawn('alpaca', fullArgs, {
      env: {
        ...process.env,
        // CLI reads these automatically (env-based auth)
        ALPACA_API_KEY: process.env.ALPACA_API_KEY,
        ALPACA_SECRET_KEY: process.env.ALPACA_SECRET_KEY,
        // Paper trading by default
        ALPACA_LIVE_TRADE: process.env.ALPACA_LIVE_TRADE || 'false',
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Send JSON input to stdin if provided
    if (input) {
      proc.stdin.write(JSON.stringify(input));
      proc.stdin.end();
    }

    proc.on('close', (exitCode) => {
      console.log(`[ALPACA CLI] Exit code: ${exitCode}`);
      
      if (exitCode === 0) {
        try {
          const data = JSON.parse(stdout);
          console.log(`[ALPACA CLI] ✅ Success`);
          resolve({
            success: true,
            data,
            exitCode,
          });
        } catch (parseError) {
          console.error(`[ALPACA CLI] ❌ Failed to parse JSON output`);
          resolve({
            success: false,
            error: `Failed to parse CLI output: ${parseError}`,
            stderr: stdout, // Raw output for debugging
            exitCode,
          });
        }
      } else {
        console.error(`[ALPACA CLI] ❌ Command failed`);
        resolve({
          success: false,
          error: stderr || stdout || `CLI command failed with exit code ${exitCode}`,
          stderr,
          exitCode,
        });
      }
    });

    proc.on('error', (error) => {
      console.error(`[ALPACA CLI] ❌ Process error:`, error);
      resolve({
        success: false,
        error: `Failed to execute CLI: ${error.message}. Ensure 'alpaca' CLI is installed (go install github.com/alpacahq/cli/cmd/alpaca@latest)`,
        exitCode: -1,
      });
    });
  });
}

/**
 * Check if CLI is installed and configured
 */
export async function checkCLIAvailable(): Promise<boolean> {
  const result = await executeAlpacaCLI(['version']);
  return result.success;
}

/**
 * Get CLI version
 */
export async function getCLIVersion(): Promise<string | null> {
  const result = await executeAlpacaCLI<{ version: string }>(['version']);
  return result.success ? result.data?.version || null : null;
}
