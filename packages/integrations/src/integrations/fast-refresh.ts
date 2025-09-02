export class FastRefreshIntegration {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async setupFastRefresh() {
    return {
      name: 'fast-refresh',
      setup: () => ({
        react: true,
        overlay: true,
        hmr: true,
      }),
    };
  }

  async initialize() {
    return [await this.setupFastRefresh()];
  }
}
