import { badRequest, isAdminRequest, unauthorized } from '@/lib/auth';
import { getReports, saveReports } from '@/lib/store';
import type { ReportStatus } from '@/lib/types';

const REPORT_STATUSES = ['open', 'in-progress', 'resolved'] as const;

function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === 'string' && (REPORT_STATUSES as readonly string[]).includes(value);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest('invalid JSON body');
  const { status, adminNotes } = body;
  if (status !== undefined && !isReportStatus(status)) {
    return badRequest(`status must be one of: ${REPORT_STATUSES.join(', ')}`);
  }
  if (adminNotes !== undefined && typeof adminNotes !== 'string') return badRequest('adminNotes must be a string');

  const reports = getReports();
  const report = reports.find((r) => r.id === id);
  if (!report) return Response.json({ error: 'report not found' }, { status: 404 });
  if (status !== undefined) report.status = status;
  if (adminNotes !== undefined) report.adminNotes = adminNotes;
  saveReports(reports);
  return Response.json(report);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return unauthorized();
  const { id } = await params;
  const reports = getReports();
  if (!reports.some((r) => r.id === id)) return Response.json({ error: 'report not found' }, { status: 404 });
  saveReports(reports.filter((r) => r.id !== id));
  return Response.json({ ok: true });
}
