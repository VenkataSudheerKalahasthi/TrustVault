import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentShareModal } from '../components/DocumentShareModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('TrustVault Frontend Security & ACL Components', () => {
  const mockDocument = {
    id: 'doc-123-uuid',
    title: 'Confidential Financial Report',
    ownerId: 'owner-uuid',
    originalFileName: 'report_q4.pdf',
    mimeType: 'application/pdf',
    fileSize: 1048576,
    fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    storagePath: 'documents/doc-123-uuid/v1/report_q4.pdf',
    currentVersion: 1,
    isArchived: false,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: {
      id: 'owner-uuid',
      email: 'owner@trustvault.security',
      firstName: 'Priya',
      lastName: 'Owner',
    },
  };

  it('DocumentShareModal enforces permission choice (READ/EDIT) and download toggle', () => {
    const handleClose = vi.fn();

    render(
      <DocumentShareModal
        onClose={handleClose}
        document={mockDocument}
      />,
      { wrapper: createWrapper() }
    );

    // Verify modal header and document title
    expect(screen.getByText('Manage Access & Permissions')).toBeInTheDocument();
    expect(screen.getByText('Confidential Financial Report')).toBeInTheDocument();

    // Verify access level selector exists with READ and EDIT
    const accessSelect = screen.getByLabelText(/Access Level/i);
    expect(accessSelect).toBeInTheDocument();
    expect(screen.getByText(/Read \(Preview & metadata only\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Edit \(Can upload replacement version\)/i)).toBeInTheDocument();

    // Verify Download toggle exists
    const downloadCheckbox = screen.getByRole('checkbox');
    expect(downloadCheckbox).toBeInTheDocument();
    expect(downloadCheckbox).toBeChecked(); // defaults to allowed

    // Toggle download checkbox
    fireEvent.click(downloadCheckbox);
    expect(downloadCheckbox).not.toBeChecked();
  });

  it('DocumentPreviewModal respects canDownload policy and hides/disables download when restricted', () => {
    const handleClose = vi.fn();
    const handleDownload = vi.fn();

    // 1. Render preview modal with canDownload: false
    const { rerender } = render(
      <DocumentPreviewModal
        onClose={handleClose}
        document={{ ...mockDocument, canDownload: false }}
        onDownload={handleDownload}
      />
    );

    expect(screen.getByText('Confidential Financial Report')).toBeInTheDocument();
    // Download button should NOT be present when canDownload is false
    expect(screen.queryByRole('button', { name: /Download/i })).not.toBeInTheDocument();

    // 2. Rerender with canDownload: true
    rerender(
      <DocumentPreviewModal
        onClose={handleClose}
        document={{ ...mockDocument, canDownload: true }}
        onDownload={handleDownload}
      />
    );

    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
  });
});
