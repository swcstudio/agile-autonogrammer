/**
 * Enterprise Push Notification Manager
 * Handles FCM v1 API, segmentation, and multi-platform notifications
 */

export interface NotificationConfig {
  fcm: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    messagingSenderId: string;
    appId: string;
    vapidKey: string;
  };
  segmentation: {
    enabled: boolean;
    rules: SegmentationRule[];
  };
  analytics: {
    trackDelivery: boolean;
    trackEngagement: boolean;
    trackConversion: boolean;
  };
}

export interface NotificationMessage {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  actions?: NotificationAction[];
  data?: Record<string, any>;
  url?: string;
  ttl?: number;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface SegmentationRule {
  id: string;
  name: string;
  conditions: Condition[];
  operator: 'AND' | 'OR';
}

export interface Condition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  message: NotificationMessage;
  segments: string[];
  scheduling: {
    type: 'immediate' | 'scheduled' | 'recurring';
    sendAt?: Date;
    timezone?: string;
    recurring?: {
      frequency: 'daily' | 'weekly' | 'monthly';
      daysOfWeek?: number[];
      time: string;
    };
  };
  targeting: {
    platforms?: ('web' | 'android' | 'ios')[];
    languages?: string[];
    countries?: string[];
    userProperties?: Record<string, any>;
  };
  analytics: {
    sent: number;
    delivered: number;
    clicked: number;
    dismissed: number;
    converted: number;
  };
}

export class PushNotificationManager {
  private config: NotificationConfig;
  private messaging: any;
  private subscribers: Map<string, SubscriptionInfo> = new Map();
  private campaigns: Map<string, NotificationCampaign> = new Map();
  private initialized = false;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Import Firebase dynamically
      const { initializeApp } = await import('firebase/app');
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

      // Initialize Firebase
      const app = initializeApp(this.config.fcm);
      this.messaging = getMessaging(app);

      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        await this.registerServiceWorker();
        await this.subscribeToNotifications();
        this.setupMessageHandling();
      }

      this.initialized = true;
      console.log('[Push Manager] Initialized successfully');
    } catch (error) {
      console.error('[Push Manager] Failed to initialize:', error);
      throw error;
    }
  }

  async subscribeToNotifications(): Promise<string | null> {
    if (!this.initialized || !this.messaging) return null;

    try {
      const { getToken } = await import('firebase/messaging');
      
      const currentToken = await getToken(this.messaging, {
        vapidKey: this.config.fcm.vapidKey
      });

      if (currentToken) {
        const subscriptionInfo: SubscriptionInfo = {
          token: currentToken,
          endpoint: 'fcm',
          platform: this.detectPlatform(),
          subscribedAt: new Date(),
          active: true,
          segments: [],
          userProperties: await this.getUserProperties()
        };

        this.subscribers.set(currentToken, subscriptionInfo);
        
        // Apply segmentation
        if (this.config.segmentation.enabled) {
          await this.applySegmentation(currentToken);
        }

        // Track subscription
        this.trackEvent('notification_subscribed', {
          token: currentToken,
          platform: subscriptionInfo.platform
        });

        return currentToken;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Failed to get registration token:', error);
      return null;
    }
  }

  async unsubscribe(token?: string): Promise<boolean> {
    try {
      const { deleteToken } = await import('firebase/messaging');
      
      const result = await deleteToken(this.messaging);
      
      if (token && this.subscribers.has(token)) {
        this.subscribers.delete(token);
        this.trackEvent('notification_unsubscribed', { token });
      }

      return result;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  async sendNotification(
    message: NotificationMessage,
    targets?: string[] | SegmentationRule[]
  ): Promise<{ success: number; failed: number }> {
    if (!this.initialized) {
      throw new Error('Push manager not initialized');
    }

    let recipients: string[] = [];

    if (!targets) {
      // Send to all subscribers
      recipients = Array.from(this.subscribers.keys());
    } else if (typeof targets[0] === 'string') {
      // Send to specific tokens
      recipients = targets as string[];
    } else {
      // Apply segmentation rules
      recipients = await this.getSegmentedTokens(targets as SegmentationRule[]);
    }

    let success = 0;
    let failed = 0;

    // Send notifications in batches
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      try {
        const results = await this.sendBatch(message, batch);
        success += results.success;
        failed += results.failed;
      } catch (error) {
        console.error('Batch send failed:', error);
        failed += batch.length;
      }
    }

    // Track campaign analytics
    this.trackEvent('notification_sent', {
      message_title: message.title,
      recipients_count: recipients.length,
      success_count: success,
      failed_count: failed
    });

    return { success, failed };
  }

  async createCampaign(campaign: Omit<NotificationCampaign, 'id' | 'analytics'>): Promise<string> {
    const id = this.generateId();
    const fullCampaign: NotificationCampaign = {
      id,
      ...campaign,
      analytics: {
        sent: 0,
        delivered: 0,
        clicked: 0,
        dismissed: 0,
        converted: 0
      }
    };

    this.campaigns.set(id, fullCampaign);

    // Schedule campaign if needed
    if (fullCampaign.scheduling.type === 'scheduled' && fullCampaign.scheduling.sendAt) {
      this.scheduleCampaign(fullCampaign);
    } else if (fullCampaign.scheduling.type === 'immediate') {
      await this.executeCampaign(fullCampaign);
    }

    return id;
  }

  async subscribeToTopic(token: string, topic: string): Promise<boolean> {
    try {
      // In a real implementation, this would call FCM's topic management API
      const subscriber = this.subscribers.get(token);
      if (subscriber) {
        if (!subscriber.topics) subscriber.topics = [];
        if (!subscriber.topics.includes(topic)) {
          subscriber.topics.push(topic);
        }
      }

      this.trackEvent('topic_subscribed', { token, topic });
      return true;
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      return false;
    }
  }

  async unsubscribeFromTopic(token: string, topic: string): Promise<boolean> {
    try {
      const subscriber = this.subscribers.get(token);
      if (subscriber?.topics) {
        subscriber.topics = subscriber.topics.filter(t => t !== topic);
      }

      this.trackEvent('topic_unsubscribed', { token, topic });
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from topic:', error);
      return false;
    }
  }

  getAnalytics(campaignId?: string): any {
    if (campaignId) {
      const campaign = this.campaigns.get(campaignId);
      return campaign?.analytics || null;
    }

    // Return aggregate analytics
    const aggregate = {
      total_subscribers: this.subscribers.size,
      active_subscribers: Array.from(this.subscribers.values()).filter(s => s.active).length,
      total_campaigns: this.campaigns.size,
      total_sent: 0,
      total_delivered: 0,
      total_clicked: 0,
      total_converted: 0
    };

    this.campaigns.forEach(campaign => {
      aggregate.total_sent += campaign.analytics.sent;
      aggregate.total_delivered += campaign.analytics.delivered;
      aggregate.total_clicked += campaign.analytics.clicked;
      aggregate.total_converted += campaign.analytics.converted;
    });

    return aggregate;
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private setupMessageHandling(): void {
    const { onMessage } = import('firebase/messaging');
    
    onMessage(this.messaging, (payload) => {
      console.log('Message received:', payload);
      
      // Track message received
      this.trackEvent('notification_received', {
        title: payload.notification?.title,
        from: payload.from
      });

      // Handle foreground messages
      this.handleForegroundMessage(payload);
    });
  }

  private handleForegroundMessage(payload: any): void {
    const { notification, data } = payload;
    
    if (notification) {
      // Show custom notification
      const options: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: data?.tag || 'katalyst-notification',
        data: data || {},
        requireInteraction: data?.requireInteraction === 'true',
        actions: data?.actions ? JSON.parse(data.actions) : []
      };

      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(notification.title, options);
      });
    }
  }

  private async sendBatch(
    message: NotificationMessage,
    tokens: string[]
  ): Promise<{ success: number; failed: number }> {
    // In a real implementation, this would use FCM HTTP v1 API
    // For now, we'll simulate the batch sending
    
    const payload = {
      notification: {
        title: message.title,
        body: message.body,
        image: message.image
      },
      data: message.data || {},
      webpush: {
        headers: {
          TTL: (message.ttl || 86400).toString() // Default 24 hours
        },
        notification: {
          icon: message.icon || '/icons/icon-192x192.png',
          badge: message.badge || '/icons/badge-72x72.png',
          tag: message.tag,
          requireInteraction: message.requireInteraction,
          silent: message.silent,
          timestamp: message.timestamp || Date.now(),
          actions: message.actions
        }
      }
    };

    let success = 0;
    let failed = 0;

    // Simulate API call (replace with actual FCM v1 API call)
    for (const token of tokens) {
      try {
        // Mock API call
        await this.mockFCMSend(token, payload);
        success++;
      } catch (error) {
        console.error(`Failed to send to ${token}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  private async mockFCMSend(token: string, payload: any): Promise<void> {
    // Mock implementation - replace with actual FCM v1 API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          resolve();
        } else {
          reject(new Error('Mock send failure'));
        }
      }, 100);
    });
  }

  private async applySegmentation(token: string): Promise<void> {
    const subscriber = this.subscribers.get(token);
    if (!subscriber || !this.config.segmentation.enabled) return;

    const segments: string[] = [];

    for (const rule of this.config.segmentation.rules) {
      if (await this.evaluateRule(rule, subscriber)) {
        segments.push(rule.id);
      }
    }

    subscriber.segments = segments;
    this.subscribers.set(token, subscriber);
  }

  private async evaluateRule(rule: SegmentationRule, subscriber: SubscriptionInfo): Promise<boolean> {
    const results = await Promise.all(
      rule.conditions.map(condition => this.evaluateCondition(condition, subscriber))
    );

    return rule.operator === 'AND' 
      ? results.every(r => r)
      : results.some(r => r);
  }

  private async evaluateCondition(condition: Condition, subscriber: SubscriptionInfo): Promise<boolean> {
    const fieldValue = this.getFieldValue(condition.field, subscriber);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, subscriber: SubscriptionInfo): any {
    const paths = field.split('.');
    let value: any = subscriber;
    
    for (const path of paths) {
      value = value?.[path];
      if (value === undefined) break;
    }
    
    return value;
  }

  private async getSegmentedTokens(rules: SegmentationRule[]): Promise<string[]> {
    const tokens: string[] = [];
    
    for (const [token, subscriber] of this.subscribers) {
      for (const rule of rules) {
        if (await this.evaluateRule(rule, subscriber)) {
          tokens.push(token);
          break; // Token matches at least one rule
        }
      }
    }
    
    return tokens;
  }

  private async scheduleCampaign(campaign: NotificationCampaign): Promise<void> {
    const { sendAt } = campaign.scheduling;
    if (!sendAt) return;

    const delay = sendAt.getTime() - Date.now();
    if (delay <= 0) {
      await this.executeCampaign(campaign);
      return;
    }

    setTimeout(() => {
      this.executeCampaign(campaign);
    }, delay);
  }

  private async executeCampaign(campaign: NotificationCampaign): Promise<void> {
    try {
      // Get recipients based on segments
      const recipients = await this.getSegmentedTokens(
        this.config.segmentation.rules.filter(rule => 
          campaign.segments.includes(rule.id)
        )
      );

      // Apply targeting filters
      const filteredRecipients = this.applyTargeting(recipients, campaign.targeting);

      // Send notifications
      const results = await this.sendNotification(campaign.message, filteredRecipients);
      
      // Update campaign analytics
      campaign.analytics.sent = results.success + results.failed;
      campaign.analytics.delivered = results.success;
      
      this.campaigns.set(campaign.id, campaign);
      
      this.trackEvent('campaign_executed', {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        recipients_count: filteredRecipients.length,
        sent_count: results.success + results.failed,
        delivered_count: results.success
      });
    } catch (error) {
      console.error('Campaign execution failed:', error);
    }
  }

  private applyTargeting(tokens: string[], targeting: NotificationCampaign['targeting']): string[] {
    return tokens.filter(token => {
      const subscriber = this.subscribers.get(token);
      if (!subscriber) return false;

      // Platform targeting
      if (targeting.platforms && !targeting.platforms.includes(subscriber.platform)) {
        return false;
      }

      // Language targeting
      if (targeting.languages && subscriber.userProperties?.language) {
        if (!targeting.languages.includes(subscriber.userProperties.language)) {
          return false;
        }
      }

      // Country targeting
      if (targeting.countries && subscriber.userProperties?.country) {
        if (!targeting.countries.includes(subscriber.userProperties.country)) {
          return false;
        }
      }

      // User properties targeting
      if (targeting.userProperties) {
        for (const [key, value] of Object.entries(targeting.userProperties)) {
          if (subscriber.userProperties?.[key] !== value) {
            return false;
          }
        }
      }

      return true;
    });
  }

  private detectPlatform(): 'web' | 'android' | 'ios' {
    const ua = navigator.userAgent.toLowerCase();
    
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
    return 'web';
  }

  private async getUserProperties(): Promise<Record<string, any>> {
    return {
      platform: this.detectPlatform(),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      connectionType: (navigator as any).connection?.effectiveType
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private trackEvent(event: string, data: Record<string, any>): void {
    // Integration with monitoring system
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(event, data);
    }
    
    console.log(`[Push Manager] ${event}:`, data);
  }
}

interface SubscriptionInfo {
  token: string;
  endpoint: string;
  platform: 'web' | 'android' | 'ios';
  subscribedAt: Date;
  lastSeen?: Date;
  active: boolean;
  segments: string[];
  topics?: string[];
  userProperties: Record<string, any>;
}