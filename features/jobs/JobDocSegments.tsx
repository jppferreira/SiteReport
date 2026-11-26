import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { SegmentedControl } from '@/components';
import type { JobsDocKindFilter } from '@/hooks/useJobs';
import { useI18n } from '@/i18n/useI18n';
import type { DocumentKind } from '@/models';

const SEGMENTS: DocumentKind[] = ['quote', 'report', 'invoice'];

type JobDocSegmentsProps = {
  value: JobsDocKindFilter;
  onChange: (value: JobsDocKindFilter) => void;
};

export function JobDocSegments({ value, onChange }: JobDocSegmentsProps) {
  const { t } = useI18n();

  const selected: DocumentKind = value === 'all' ? 'quote' : value;

  const segments = useMemo(
    () =>
      SEGMENTS.map((kind) => {
        const label =
          kind === 'quote'
            ? t('jobs.segmentQuote')
            : kind === 'report'
              ? t('jobs.segmentReport')
              : t('jobs.segmentInvoice');
        return { key: kind, label };
      }),
    [t]
  );

  return (
    <SegmentedControl
      segments={segments}
      value={selected}
      onChange={(key) => onChange(key as DocumentKind)}
      tone="accent"
      style={styles.control}
    />
  );
}

const styles = StyleSheet.create({
  control: {
    height: 56,
  },
});
