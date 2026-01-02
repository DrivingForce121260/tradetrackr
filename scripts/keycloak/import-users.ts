#!/usr/bin/env npx tsx
/**
 * Keycloak User Import Script
 * 
 * Imports users from CSV/JSON into Keycloak with:
 * - email as username
 * - tenant_id attribute (concernID)
 * - role assignments
 * - REQUIRED_ACTIONS: UPDATE_PASSWORD (forced password reset)
 * 
 * Usage:
 *   npx tsx scripts/keycloak/import-users.ts --input users.csv
 *   npx tsx scripts/keycloak/import-users.ts --input users.json --dry-run
 * 
 * CSV format:
 *   email,tenant_id,roles
 *   user@example.com,DE1234567890,admin
 *   other@example.com,DE1234567890,staff|accounting
 * 
 * JSON format:
 *   [{ "email": "...", "tenant_id": "...", "roles": ["admin"] }]
 * 
 * Environment:
 *   KEYCLOAK_BASE_URL - Keycloak base URL (default: https://auth.tradetrackr.de)
 *   KEYCLOAK_REALM - Realm name (default: tradetrackr)
 *   KEYCLOAK_ADMIN_USER - Admin username
 *   KEYCLOAK_ADMIN_PASSWORD - Admin password
 * 
 * @see /runbooks/user-migration.md
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

interface Config {
  baseUrl: string;
  realm: string;
  adminUser: string;
  adminPassword: string;
  inputFile: string;
  dryRun: boolean;
}

function getConfig(): Config {
  const args = process.argv.slice(2);
  
  let inputFile = '';
  let dryRun = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputFile = args[i + 1];
      i++;
    }
    if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }
  
  if (!inputFile) {
    console.error('Usage: npx tsx import-users.ts --input <file.csv|file.json> [--dry-run]');
    process.exit(1);
  }
  
  return {
    baseUrl: process.env.KEYCLOAK_BASE_URL || 'https://auth.tradetrackr.de',
    realm: process.env.KEYCLOAK_REALM || 'tradetrackr',
    adminUser: process.env.KEYCLOAK_ADMIN_USER || 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || '',
    inputFile,
    dryRun,
  };
}

// ============================================================================
// Types
// ============================================================================

interface UserInput {
  email: string;
  tenant_id: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
}

interface KeycloakUser {
  username: string;
  email: string;
  emailVerified: boolean;
  enabled: boolean;
  firstName?: string;
  lastName?: string;
  attributes: Record<string, string[]>;
  requiredActions: string[];
}

// ============================================================================
// Keycloak Admin API
// ============================================================================

class KeycloakAdmin {
  private baseUrl: string;
  private realm: string;
  private accessToken: string | null = null;
  
  constructor(baseUrl: string, realm: string) {
    this.baseUrl = baseUrl;
    this.realm = realm;
  }
  
  async authenticate(username: string, password: string): Promise<void> {
    const tokenUrl = `${this.baseUrl}/realms/master/protocol/openid-connect/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username,
        password,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authentication failed: ${response.status} - ${error}`);
    }
    
    const data = await response.json() as { access_token: string };
    this.accessToken = data.access_token;
  }
  
  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }
    
    const url = `${this.baseUrl}/admin/realms/${this.realm}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    return response;
  }
  
  async findUser(email: string): Promise<any | null> {
    const response = await this.request(`/users?email=${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to search users: ${response.status}`);
    }
    
    const users = await response.json() as any[];
    return users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
  }
  
  async createUser(user: KeycloakUser): Promise<string> {
    const response = await this.request('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    
    if (response.status === 409) {
      throw new Error('User already exists');
    }
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create user: ${response.status} - ${error}`);
    }
    
    // Get user ID from Location header
    const location = response.headers.get('Location');
    if (!location) {
      throw new Error('No Location header in response');
    }
    
    return location.split('/').pop() || '';
  }
  
  async updateUser(userId: string, user: Partial<KeycloakUser>): Promise<void> {
    const response = await this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update user: ${response.status} - ${error}`);
    }
  }
  
  async getRealmRoles(): Promise<Array<{ id: string; name: string }>> {
    const response = await this.request('/roles');
    
    if (!response.ok) {
      throw new Error(`Failed to get roles: ${response.status}`);
    }
    
    return response.json() as Promise<Array<{ id: string; name: string }>>;
  }
  
  async assignRoles(userId: string, roleIds: Array<{ id: string; name: string }>): Promise<void> {
    const response = await this.request(`/users/${userId}/role-mappings/realm`, {
      method: 'POST',
      body: JSON.stringify(roleIds),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to assign roles: ${response.status} - ${error}`);
    }
  }
}

// ============================================================================
// File Parsing
// ============================================================================

function parseCSV(content: string): UserInput[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const emailIdx = header.indexOf('email');
  const tenantIdx = header.indexOf('tenant_id');
  const rolesIdx = header.indexOf('roles');
  
  if (emailIdx === -1 || tenantIdx === -1) {
    throw new Error('CSV must have "email" and "tenant_id" columns');
  }
  
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim());
    return {
      email: cols[emailIdx],
      tenant_id: cols[tenantIdx],
      roles: rolesIdx >= 0 && cols[rolesIdx] ? cols[rolesIdx].split('|') : ['staff'],
    };
  }).filter(u => u.email && u.tenant_id);
}

function parseJSON(content: string): UserInput[] {
  const data = JSON.parse(content);
  if (!Array.isArray(data)) {
    throw new Error('JSON must be an array of user objects');
  }
  
  return data.map(u => ({
    email: u.email,
    tenant_id: u.tenant_id || u.tenantId || u.concernID,
    roles: Array.isArray(u.roles) ? u.roles : [u.roles || 'staff'],
    firstName: u.firstName || u.vorname,
    lastName: u.lastName || u.nachname,
  })).filter(u => u.email && u.tenant_id);
}

function loadUsers(filePath: string): UserInput[] {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (ext === '.json') {
    return parseJSON(content);
  } else if (ext === '.csv') {
    return parseCSV(content);
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const config = getConfig();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TradeTrackr Keycloak User Import');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Keycloak: ${config.baseUrl}`);
  console.log(`  Realm:    ${config.realm}`);
  console.log(`  Input:    ${config.inputFile}`);
  console.log(`  Mode:     ${config.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  // Load users
  const users = loadUsers(config.inputFile);
  console.log(`Found ${users.length} users to import`);
  
  if (users.length === 0) {
    console.log('No users to import. Exiting.');
    return;
  }
  
  if (config.dryRun) {
    console.log('\n--- DRY RUN: Preview ---');
    users.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.email} | tenant: ${u.tenant_id} | roles: ${u.roles.join(', ')}`);
    });
    console.log('\nDry run complete. Use without --dry-run to import.');
    return;
  }
  
  // Check credentials
  if (!config.adminPassword) {
    console.error('ERROR: KEYCLOAK_ADMIN_PASSWORD environment variable required');
    process.exit(1);
  }
  
  // Authenticate
  console.log('\nAuthenticating with Keycloak...');
  const admin = new KeycloakAdmin(config.baseUrl, config.realm);
  await admin.authenticate(config.adminUser, config.adminPassword);
  console.log('✅ Authenticated');
  
  // Get realm roles
  const realmRoles = await admin.getRealmRoles();
  const roleMap = new Map(realmRoles.map(r => [r.name, r]));
  
  // Import users
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const user of users) {
    try {
      process.stdout.write(`  ${user.email}... `);
      
      const existing = await admin.findUser(user.email);
      
      const kcUser: KeycloakUser = {
        username: user.email,
        email: user.email,
        emailVerified: false,
        enabled: true,
        firstName: user.firstName,
        lastName: user.lastName,
        attributes: {
          tenant_id: [user.tenant_id],
        },
        requiredActions: ['UPDATE_PASSWORD'],
      };
      
      let userId: string;
      
      if (existing) {
        // Update existing user
        userId = existing.id;
        await admin.updateUser(userId, kcUser);
        updated++;
        process.stdout.write('UPDATED\n');
      } else {
        // Create new user
        userId = await admin.createUser(kcUser);
        created++;
        process.stdout.write('CREATED\n');
      }
      
      // Assign roles
      const rolesToAssign = user.roles
        .map(r => roleMap.get(r))
        .filter((r): r is { id: string; name: string } => !!r);
      
      if (rolesToAssign.length > 0) {
        await admin.assignRoles(userId, rolesToAssign);
      }
      
    } catch (error: any) {
      errors++;
      process.stdout.write(`ERROR: ${error.message}\n`);
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Import Complete');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Created:  ${created}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  if (errors > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

