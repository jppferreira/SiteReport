import Constants from 'expo-constants';
import React from 'react';
import { Platform } from 'react-native';

import { publicErrorSummary, sendBugReport } from '@/features/settings/bugReport';
import { t } from '@/i18n';
import { logger } from '@/utils/logger';

import { ErrorState } from './ErrorState';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  failed: boolean;
  summary: string;
  sending: boolean;
  sent: boolean;
  sendFailed: boolean;
};

/**
 * A render error in one screen used to take down the whole app. This keeps
 * the shell up and lets the person try the screen again. Job data stays on
 * the device either way.
 */
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    failed: false,
    summary: '',
    sending: false,
    sent: false,
    sendFailed: false,
  };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    logger.error('Unhandled screen error', error);
    this.setState({ summary: publicErrorSummary(error), sent: false, sendFailed: false });
  }

  private sendReport = () => {
    if (this.state.sending || this.state.sent) return;
    this.setState({ sending: true, sendFailed: false });
    void sendBugReport({
      whatHappened: this.state.summary || t('components.errorBoundaryFallbackSummary'),
      expected: '',
      steps: '',
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
      platform: Platform.OS,
    })
      .then(() => this.setState({ sending: false, sent: true }))
      .catch(() => this.setState({ sending: false, sendFailed: true }));
  };

  render() {
    if (!this.state.failed) return this.props.children;
    const description = this.state.sent
      ? t('components.errorBoundaryDescriptionSent')
      : this.state.sendFailed
        ? t('components.errorBoundaryDescriptionSendFailed')
        : t('components.errorBoundaryDescription');
    return (
      <ErrorState
        title={t('components.errorBoundaryTitle')}
        description={description}
        onAction={() =>
          this.setState({ failed: false, summary: '', sending: false, sent: false, sendFailed: false })
        }
        secondaryLabel={
          this.state.sent
            ? t('components.errorBoundaryReportSent')
            : this.state.sending
              ? t('components.errorBoundarySending')
              : t('components.errorBoundarySendReport')
        }
        onSecondary={this.sendReport}
        secondaryDisabled={this.state.sending || this.state.sent}
      />
    );
  }
}
