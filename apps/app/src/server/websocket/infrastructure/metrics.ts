/**
 * WebSocket metrics tracking
 */
export class WebSocketMetrics {
  private activeConnections = 0;
  private totalMessagesSent = 0;
  private totalMessagesReceived = 0;
  private totalErrors = 0;
  private activeSubscriptions = 0;
  private subscribersPerChannel = new Map<string, number>();

  recordConnection(): void {
    this.activeConnections++;
  }

  recordDisconnection(): void {
    this.activeConnections--;
  }

  recordMessageSent(): void {
    this.totalMessagesSent++;
  }

  recordMessageReceived(): void {
    this.totalMessagesReceived++;
  }

  recordError(): void {
    this.totalErrors++;
  }

  recordSubscription(channelId: string): void {
    this.activeSubscriptions++;
    const current = this.subscribersPerChannel.get(channelId) || 0;
    this.subscribersPerChannel.set(channelId, current + 1);
  }

  recordUnsubscription(channelId: string): void {
    this.activeSubscriptions--;
    const current = this.subscribersPerChannel.get(channelId) || 0;
    const newCount = Math.max(0, current - 1);

    if (newCount === 0) {
      this.subscribersPerChannel.delete(channelId);
    } else {
      this.subscribersPerChannel.set(channelId, newCount);
    }
  }

  getMetrics() {
    return {
      activeConnections: this.activeConnections,
      totalMessagesSent: this.totalMessagesSent,
      totalMessagesReceived: this.totalMessagesReceived,
      totalErrors: this.totalErrors,
      activeSubscriptions: this.activeSubscriptions,
      subscribersPerChannel: Object.fromEntries(this.subscribersPerChannel),
    };
  }
}

export const wsMetrics = new WebSocketMetrics();
