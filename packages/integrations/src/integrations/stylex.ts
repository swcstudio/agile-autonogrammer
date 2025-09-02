export class StyleXIntegration {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async setupStyleX() {
    return {
      name: 'stylex-css',
      setup: () => ({
        atomic: true,
        theme: {},
        tokens: {},
      }),
    };
  }

  async initialize() {
    return [await this.setupStyleX()];
  }
}
