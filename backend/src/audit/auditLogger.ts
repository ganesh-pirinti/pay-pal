import { createHash } from 'crypto';
import type { AuditLogEntry } from '../../../shared/src/types.js';

/**
 * PayPal TrustShield AI — Immutable Audit Log Engine
 * 
 * Records cryptographic-ready audit entries for all underwriter actions, automated risk verdicts,
 * security alerts, and system configuration modifications.
 */
class AuditLogStore {
  private logs: AuditLogEntry[] = [];

  constructor() {
    this.seedInitialAuditLogs();
  }

  private seedInitialAuditLogs(): void {
    const initialEvents = [
      {
        eventType: 'EVALUATION' as const,
        userId: 'SYSTEM-AI-AGENT-04',
        userRole: 'automated_agent',
        caseId: 'CASE-AI-900115-103',
        details: 'Multi-Agent Collective finalized evaluation. Risk Score: 85 (High Risk). HITL Escalation triggered.',
        ipAddress: '127.0.0.1'
      },
      {
        eventType: 'OVERRIDE' as const,
        userId: 'SEC-USER-001',
        userRole: 'underwriter',
        caseId: 'CASE-AI-900115-103',
        details: 'Underwriter action recorded: Place on 48h Rolling Monitor. Notes: Confirmed shipping tracking numbers.',
        ipAddress: '10.0.4.12'
      },
      {
        eventType: 'SECURITY_ALERT' as const,
        userId: 'GATEWAY-SANITIZER',
        userRole: 'security_filter',
        details: 'Adversarial Prompt Injection quarantined: Subversion directive intercepted.',
        ipAddress: '198.51.100.44'
      },
      {
        eventType: 'RULE_CHANGE' as const,
        userId: 'ADMIN-SUPER-01',
        userRole: 'admin',
        details: 'Risk engine threshold updated: disputeRate.critical set to 0.08.',
        ipAddress: '10.0.1.5'
      }
    ];

    initialEvents.forEach((ev, idx) => {
      const timestamp = new Date(Date.now() - (initialEvents.length - idx) * 3600000).toISOString();
      const id = `AUD-${1000 + idx}`;
      const payload = `${id}|${timestamp}|${ev.eventType}|${ev.userId}|${ev.details}`;
      const checksum = createHash('sha256').update(payload).digest('hex').substring(0, 16);

      this.logs.push({
        id,
        timestamp,
        ...ev,
        checksum
      });
    });
  }

  public recordEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'checksum'>): AuditLogEntry {
    const id = `AUD-${1000 + this.logs.length}`;
    const timestamp = new Date().toISOString();
    const payload = `${id}|${timestamp}|${entry.eventType}|${entry.userId}|${entry.details}`;
    const checksum = createHash('sha256').update(payload).digest('hex').substring(0, 16);

    const fullEntry: AuditLogEntry = {
      id,
      timestamp,
      ...entry,
      checksum
    };

    this.logs.unshift(fullEntry);
    return fullEntry;
  }

  public getLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(0, limit);
  }

  public exportCsv(): string {
    const header = 'id,timestamp,eventType,userId,userRole,caseId,details,ipAddress,checksum';
    const rows = this.logs.map(log => {
      const safeDetails = `"${(log.details || '').replace(/"/g, '""')}"`;
      return `${log.id},${log.timestamp},${log.eventType},${log.userId},${log.userRole},${log.caseId || ''},${safeDetails},${log.ipAddress},${log.checksum}`;
    });
    return [header, ...rows].join('\n');
  }
}

export const auditLogger = new AuditLogStore();
