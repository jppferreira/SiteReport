import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';

import { buildReportFileName } from '@/features/reports/reportFile';
import type { BusinessProfile, Job, Photo, Signature, WorkSummary } from '@/models/domain';
import { databaseService } from '@/services/databaseService';
import { fileService } from '@/services/fileService';
import { formatJobDate } from '@/utils/date';

type ReportData = {
  job: Job;
  profile: BusinessProfile;
  beforePhotos: Photo[];
  afterPhotos: Photo[];
  summary: WorkSummary | null;
  signature: Signature | null;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const maybe = (value: string | null | undefined, fallback = '—') => (value && value.trim().length > 0 ? escapeHtml(value) : fallback);

const uriToDataUri = async (uri: string) => {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const ext = uri.endsWith('.png') ? 'png' : 'jpeg';
  return `data:image/${ext};base64,${base64}`;
};

const renderPhotoSection = async (title: string, photos: Photo[]) => {
  if (photos.length === 0) {
    return `
      <section>
        <h3>${title}</h3>
        <p class="empty">No ${title.toLowerCase()} photos were added.</p>
      </section>
    `;
  }

  const rows = await Promise.all(
    photos.map(async (photo) => {
      const imageSrc = await uriToDataUri(photo.localUri);
      return `
        <div class="photo-card">
          <img src="${imageSrc}" alt="${title} photo" />
          <p>${maybe(photo.caption, 'No caption')}</p>
        </div>
      `;
    })
  );

  return `
    <section>
      <h3>${title}</h3>
      <div class="photo-grid">${rows.join('')}</div>
    </section>
  `;
};

const renderLogo = async (profile: BusinessProfile) => {
  if (!profile.logoUri) {
    return '';
  }

  try {
    const logo = await uriToDataUri(profile.logoUri);
    return `<img class="logo" src="${logo}" alt="Business logo" />`;
  } catch {
    return '';
  }
};

const buildHtml = async (data: ReportData) => {
  const beforeSection = await renderPhotoSection('Before', data.beforePhotos);
  const afterSection = await renderPhotoSection('After', data.afterPhotos);
  const signatureImage = data.signature ? await uriToDataUri(data.signature.localSignatureUri) : null;
  const logo = await renderLogo(data.profile);

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page {
          margin: 28px 24px 38px;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
          color: #101310;
          font-size: 12px;
          line-height: 1.55;
        }
        h1, h2, h3 {
          margin: 0;
          line-height: 1.2;
        }
        h1 {
          font-size: 22px;
          margin-top: 14px;
        }
        h2 {
          font-size: 16px;
          margin: 22px 0 8px;
          color: #101310;
        }
        h3 {
          font-size: 14px;
          margin: 16px 0 8px;
        }
        .header {
          border-bottom: 1px solid #E6E9E6;
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .logo {
          max-height: 48px;
          max-width: 180px;
          object-fit: contain;
        }
        .muted {
          color: #66706A;
        }
        .meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 20px;
          margin-top: 14px;
        }
        .card {
          border: 1px solid #E6E9E6;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 14px;
          break-inside: avoid;
        }
        .label {
          color: #66706A;
          font-size: 11px;
          letter-spacing: 0.2px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .value {
          font-size: 13px;
        }
        .photo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .photo-card {
          border: 1px solid #E6E9E6;
          border-radius: 8px;
          overflow: hidden;
          break-inside: avoid;
        }
        .photo-card img {
          width: 100%;
          height: 170px;
          object-fit: cover;
          display: block;
        }
        .photo-card p {
          margin: 8px;
          color: #66706A;
          font-size: 11px;
        }
        .empty {
          color: #66706A;
          border: 1px dashed #E6E9E6;
          padding: 8px;
          border-radius: 8px;
        }
        .signature {
          max-width: 260px;
          max-height: 100px;
          border: 1px solid #E6E9E6;
          border-radius: 8px;
          margin-top: 8px;
          object-fit: contain;
        }
        .footer {
          margin-top: 22px;
          border-top: 1px solid #E6E9E6;
          padding-top: 10px;
          color: #66706A;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${logo}
        <h1>${maybe(data.profile.businessName, 'Business Name')}</h1>
        <div class="muted">JOB REPORT</div>
        <div class="meta">
          <div><span class="muted">Job:</span> ${escapeHtml(data.job.title)}</div>
          <div><span class="muted">Date:</span> ${escapeHtml(formatJobDate(data.job.jobDate))}</div>
          <div><span class="muted">Reference:</span> ${maybe(data.job.referenceNumber)}</div>
          <div><span class="muted">Status:</span> ${data.job.status === 'complete' ? 'Complete' : 'Draft'}</div>
        </div>
      </div>

      <h2>Customer</h2>
      <div class="card">
        <div class="label">Name</div>
        <div class="value">${maybe(data.job.customerName)}</div>
        <div class="label" style="margin-top: 8px;">Address</div>
        <div class="value">${maybe(data.job.address)}</div>
      </div>

      <h2>Job Summary</h2>
      <div class="card">
        <div class="value">${maybe(data.job.description, 'No job description provided.')}</div>
      </div>

      ${beforeSection}

      <h2>Work Completed</h2>
      <div class="card">
        <div class="value">${maybe(data.summary?.workCompleted, 'No work summary provided.')}</div>
        ${data.summary?.materials ? `<div class="label" style="margin-top:10px;">Materials</div><div class="value">${maybe(data.summary.materials)}</div>` : ''}
        ${data.summary?.recommendations ? `<div class="label" style="margin-top:10px;">Recommendations</div><div class="value">${maybe(data.summary.recommendations)}</div>` : ''}
        ${data.summary?.notes ? `<div class="label" style="margin-top:10px;">Additional Notes</div><div class="value">${maybe(data.summary.notes)}</div>` : ''}
      </div>

      ${afterSection}

      <h2>Customer Sign-Off</h2>
      <div class="card">
        <div class="label">Customer name</div>
        <div class="value">${maybe(data.signature?.customerName)}</div>
        ${
          signatureImage
            ? `<img class="signature" src="${signatureImage}" alt="Customer signature" /><div class="muted">Signed ${escapeHtml(formatJobDate(data.signature?.signedAt ?? data.job.jobDate))}</div>`
            : `<div class="muted">No signature captured for this report.</div>`
        }
      </div>

      <div class="footer">
        <div>${maybe(data.profile.name, '')}</div>
        <div>${[data.profile.email, data.profile.phone].filter(Boolean).join(' · ')}</div>
        <div>${maybe(data.profile.address, '')}</div>
        ${data.profile.footerMessage ? `<div style="margin-top:8px;">${escapeHtml(data.profile.footerMessage)}</div>` : ''}
      </div>
    </body>
  </html>
  `;
};

export const reportService = {
  async loadReportData(jobId: string): Promise<ReportData> {
    const [job, photos, summary, signature, profile] = await Promise.all([
      databaseService.getJob(jobId),
      databaseService.getPhotos(jobId),
      databaseService.getWorkSummary(jobId),
      databaseService.getSignature(jobId),
      databaseService.getBusinessProfile(),
    ]);

    if (!job) {
      throw new Error('Job not found');
    }

    return {
      job,
      profile,
      beforePhotos: photos.filter((photo) => photo.type === 'before'),
      afterPhotos: photos.filter((photo) => photo.type === 'after'),
      summary,
      signature,
    };
  },

  async buildPreviewHtml(jobId: string) {
    const data = await this.loadReportData(jobId);
    return buildHtml(data);
  },

  buildFileName(job: Job) {
    return buildReportFileName(job);
  },

  async generatePdf(jobId: string) {
    const data = await this.loadReportData(jobId);
    const html = await buildHtml(data);
    const printResult = await Print.printToFileAsync({ html, base64: false });
    const destination = await fileService.buildReportPath(this.buildFileName(data.job));
    await FileSystem.moveAsync({ from: printResult.uri, to: destination });
    const info = await FileSystem.getInfoAsync(destination);
    const latestReports = await databaseService.listReportsByJob(jobId);
    const version = (latestReports[0]?.version ?? 0) + 1;

    const saved = await databaseService.createReport({
      jobId,
      localPdfUri: destination,
      fileSize: info.size ?? 0,
      version,
    });

    return {
      uri: destination,
      report: saved,
    };
  },
};
