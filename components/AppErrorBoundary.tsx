import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React from 'react';
import { Platform } from 'react-native';

import { bugReportMailtoUrl, deliverBugReport, publicErrorSummary, type BugReportDraft } from '@/features/settings/bugReport';
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
  mailReady: boolean;
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
    mailReady: false,
    sendFailed: false,
  };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    logger.error('Unhandled screen error', error);
    this.setState({ summary: publicErrorSummary(error), sent: false, mailReady: false, sendFailed: false });
  }

  private reportDraft(): BugReportDraft {
    return {
      topic: 'bug',
      whatHappened: this.state.summary || t('components.errorBoundaryFallbackSummary'),
      expected: '',
      steps: '',
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
      platform: Platform.OS,
    };
  }

  private sendReport = () => {
    if (this.state.sending || this.state.sent) return;
    const draft = this.reportDraft();
    if (this.state.mailReady) {
      void Linking.openURL(bugReportMailtoUrl(draft)).catch(() =>
        this.setState({ mailReady: false, sendFailed: true }),
      );
      return;
    }
    this.setState({ sending: true, sendFailed: false, mailReady: false });
    void deliverBugReport(draft, (url) => Linking.openURL(url))
      .then((result) => {
        if (result === 'mail') this.setState({ sending: false, mailReady: true, sent: false });
        else this.setState({ sending: false, sent: true, mailReady: false });
      })
      .catch(() => this.setState({ sending: false, sendFailed: true, mailReady: false }));
  };

  render() {
    if (!this.state.failed) return this.props.children;
    const description = this.state.sent
      ? t('components.errorBoundaryDescriptionSent')
      : this.state.mailReady
        ? t('components.errorBoundaryDescriptionMail')
        : this.state.sendFailed
          ? t('components.errorBoundaryDescriptionSendFailed')
          : t('components.errorBoundaryDescription');
    return (
      <ErrorState
        title={t('components.errorBoundaryTitle')}
        description={description}
        onAction={() =>
          this.setState({
            failed: false,
            summary: '',
            sending: false,
            sent: false,
            mailReady: false,
            sendFailed: false,
          })
        }
        secondaryLabel={
          this.state.sent
            ? t('components.errorBoundaryReportSent')
            : this.state.mailReady
              ? t('components.errorBoundaryOpenMail')
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
